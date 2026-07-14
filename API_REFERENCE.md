# Detailed API Reference

This document provides the exhaustive technical specification for the generated controllers and services in `adba`.

## 1. Global Response Format
All API responses follow a consistent wrapper:
```json
{
  "success": boolean,
  "data": any,
  "error": string | null
}
```

---

## 2. Query Parameters (`GET /:table`)

The `list` method supports powerful filtering, sorting, and pagination.

### Pagination
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `limit` | int | Max records to return | `?limit=10` |
| `offset` | int | Number of records to skip | `?offset=20` |
| `page` | int | Page number (calculates offset automatically) | `?page=2` |

### General Search
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `q` | string | Search for this term across all columns | `?q=John` |

### Filtering (`filters`)
Filters can be passed as a JSON string or as direct query params.
**Operators:**
- `$eq`: Equal
- `$ne`: Not Equal
- `$gt`: Greater Than
- `$gte`: Greater Than or Equal
- `$lt`: Less Than
- `$lte`: Less Than or Equal
- `$in`: Included in array `[val1, val2]`
- `$nin`: Not included in array
- `$like`: SQL LIKE (case insensitive)
- `$nlike`: NOT LIKE

**Examples:**
- Simple: `?name=John` $\rightarrow$ `{ name: { $eq: "John" } }`
- Operator: `?age[$gte]=18` $\rightarrow$ `{ age: { $gte: 18 } }`
- Array: `?status[$in]=active,pending` $\rightarrow$ `{ status: { $in: ["active", "pending"] } }`
- Complex JSON: `?filters={"age":{"$gt":20},"city":"NY"}`

### Ordering (`orderBy`)
Sorts the results. Prefix with `-` for DESC, `+` (or nothing) for ASC.
- Single: `?orderBy=createdAt` (ASC)
- Descending: `?orderBy=-createdAt` (DESC)
- Multiple: `?orderBy=-createdAt,name` (Newest first, then alphabetical name)

### Field Selection (`fields`)
Specify which columns to return to reduce payload size.
- `?fields=id,name,email`

---

## 3. Endpoints & Service Methods

### Read Operations

| Endpoint | Method | Input | Returns | Description |
|----------|--------|-------|---------|-------------|
| `/:table` | `GET` | Query Params | `{ data: [], meta: { total, limit, offset, page } }` | Returns a paginated list of records |
| `/:table/:id` | `GET` | `id` (path) | `{ data: { ... } }` | Returns a single record by primary key |
| `/:table/name/:name` | `GET` | `name` (path) | `{ data: { ... } }` | Returns a single record by the `name` column |
| `/:table/meta` | `GET` | None | `{ tableName, jsonSchema, columns: [] }` | Returns database table schema |

### Write Operations

#### Insert (`POST /:table`)
- **Single Insert**:
  - Body: `{ "insert": { "name": "John", "email": "john@example.com" } }`
  - Returns: `{ "data": { "id": 1, ... } }`
- **Batch Insert**:
  - Body: `{ "insert": [ { "name": "A" }, { "name": "B" } ] }`
  - Returns: `{ "data": [ { "id": 1, ... }, { "id": 2, ... } ] }`

#### Update (`PATCH /:table`)
- **Single Update**:
  - Body: `{ "id": 1, "update": { "name": "John Updated" } }`
  - Returns: `{ "data": { "id": 1, "name": "John Updated", ... } }`
- **Batch Update**:
  - Body: `{ "update": [ { "id": 1, "name": "A" }, { "id": 2, "name": "B" } ] }`
  - Returns: `{ "data": [ { ... }, { ... } ] }`

#### Delete (`DELETE /:table`)
- **By ID**: Body: `{ "id": 1 }` $\rightarrow$ Deletes record 1.
- **By IDs**: Body: `{ "ids": [1, 2, 3] }` $\rightarrow$ Deletes specified records.
- **By Condition**: Body: `{ "whereData": { "status": "inactive" } }` $\rightarrow$ Deletes all matching records.
- Returns: `{ "data": { "deletedCount": X } }`

---

## 4. Metadata Schema (`/meta`)

The `/meta` endpoint provides the structure of the table for frontend dynamic forms:
- `tableName`: String name of the table.
- `columns`: Array of objects:
  - `name`: Column name.
  - `type`: Database type (e.g., `VARCHAR`, `INT`).
  - `nullable`: Boolean.
  - `primaryKey`: Boolean.
- `jsonSchema`: A JSON Schema representation of the table for validation.
