#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

source "$PROJECT_DIR/.env"

export DB_MYSQL_PASSWORD
export DB_POSTGRES_PASSWORD
export DB_MSSQL_PASSWORD
export MYSQL_ROOT_PASSWORD

DB_TYPES=("sqlite" "mysql" "postgres" "mssql")

wait_for_health() {
    local service=$1
    local host=$2
    local port=$3
    local max_attempts=30
    local attempt=0

    echo "Waiting for $service to be ready..."

    while [ $attempt -lt $max_attempts ]; do
        if nc -z "$host" "$port" 2>/dev/null || timeout 1 bash -c "echo > /dev/tcp/$host/$port" 2>/dev/null; then
            echo "$service is ready!"
            return 0
        fi
        attempt=$((attempt + 1))
        echo "Attempt $attempt/$max_attempts - waiting..."
        sleep 2
    done

    echo "ERROR: $service failed to become ready"
    return 1
}

start_database() {
    local db_type=$1

    echo "========================================="
    echo "Starting $db_type database..."
    echo "========================================="

    case $db_type in
        sqlite)
            echo "SQLite is in-memory, no Docker needed"
            return 0
            ;;
        mysql)
            docker compose -f "$PROJECT_DIR/docker-compose.testing.yml" up -d mariadb
            wait_for_health "MariaDB" "localhost" "3307"
            ;;
        postgres)
            docker compose -f "$PROJECT_DIR/docker-compose.testing.yml" up -d postgres
            wait_for_health "PostgreSQL" "localhost" "5433"
            ;;
        mssql)
            docker compose -f "$PROJECT_DIR/docker-compose.testing.yml" up -d mssql
            wait_for_health "MSSQL" "localhost" "1434"
            echo "Ensuring 'adba_test' database exists..."
            for attempt in $(seq 1 10); do
                if docker exec adba-mssql-test /opt/mssql-tools18/bin/sqlcmd \
                    -S localhost -U sa -P "$DB_MSSQL_PASSWORD" -C \
                    -Q "IF DB_ID('adba_test') IS NULL CREATE DATABASE adba_test;" 2>/dev/null; then
                    echo "MSSQL database ready!"
                    break
                fi
                echo "Attempt $attempt/10 - MSSQL not ready yet..."
                sleep 3
            done
            ;;
    esac
}

stop_database() {
    local db_type=$1

    echo "Stopping $db_type database..."

    case $db_type in
        sqlite)
            return 0
            ;;
        mysql)
            docker compose -f "$PROJECT_DIR/docker-compose.testing.yml" stop mariadb || true
            docker compose -f "$PROJECT_DIR/docker-compose.testing.yml" rm -f mariadb || true
            ;;
        postgres)
            docker compose -f "$PROJECT_DIR/docker-compose.testing.yml" stop postgres || true
            docker compose -f "$PROJECT_DIR/docker-compose.testing.yml" rm -f postgres || true
            ;;
        mssql)
            docker compose -f "$PROJECT_DIR/docker-compose.testing.yml" stop mssql || true
            docker compose -f "$PROJECT_DIR/docker-compose.testing.yml" rm -f mssql || true
            ;;
    esac

    echo "$db_type stopped and cleaned up"
}

run_tests() {
    local db_type=$1

    echo "Running e2e tests for $db_type..."
    DB_TYPE=$db_type yarn jest --config "$PROJECT_DIR/jest.config.e2e.ts" --forceExit
}

echo "Starting E2E test suite..."
echo "=========================="

RESULTS_DIR="$PROJECT_DIR/test-results"
mkdir -p "$RESULTS_DIR"

failed=0

for db_type in "${DB_TYPES[@]}"; do
    echo ""
    echo "########################################"
    echo "### Testing with $db_type"
    echo "########################################"

    start_database "$db_type"

    if run_tests "$db_type"; then
        echo "✓ Tests passed for $db_type"
        echo "$db_type: PASS" >> "$RESULTS_DIR/results.txt"
    else
        echo "✗ Tests failed for $db_type"
        echo "$db_type: FAIL" >> "$RESULTS_DIR/results.txt"
        failed=1
    fi

    stop_database "$db_type"

    echo "Sleeping 5 seconds before next database..."
    sleep 5
done

echo ""
echo "========================================="
echo "E2E Test Suite Complete"
echo "========================================="

if [ -f "$RESULTS_DIR/results.txt" ]; then
    cat "$RESULTS_DIR/results.txt"
fi

if [ $failed -eq 0 ]; then
    echo "All tests passed!"
    exit 0
else
    echo "Some tests failed!"
    exit 1
fi