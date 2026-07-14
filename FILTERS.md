# Filtros en ADBA

## Formato Principal de Filters (Notación con Punto)

La forma principal y recomendada para usar filtros en ADBA es con **notación de punto**:

```
filters.<columna>=valor
```

### Ejemplos de uso

```bash
# Filtro básico (igualdad)
GET /api/users/?filters.active=true
GET /api/products/?filters.category=electronics

# Filtros con operadores
GET /api/users/?filters.age.$gte=18
GET /api/users/?filters.age.$lt=65
GET /api/products/?filters.price.$gt=100
GET /api/products/?filters.price.$lte=50

# Filtros de desigualdad
GET /api/users/?filters.status.$ne=inactive

# Filtros con arrays (IN)
GET /api/users/?filters.role.$in=admin,moderator

# Filtros con arrays (NOT IN)
GET /api/users/?filters.role.$nin=guest

# Filtros con rango (BETWEEN)
GET /api/users/?filters.age.$between=18,65

# Filtros con like
GET /api/products/?filters.name.$like=%laptop%
```

## Operadores Soportados

| Operador | Descripción | Ejemplo |
|----------|-------------|---------|
| `=` | Igualdad (por defecto) | `filters.status=active` |
| `$gte` | Mayor o igual que | `filters.age.$gte=18` |
| `$gt` | Mayor que | `filters.price.$gt=100` |
| `$lte` | Menor o igual que | `filters.age.$lte=65` |
| `$lt` | Menor que | `filters.price.$lt=50` |
| `$ne` | No igual | `filters.status.$ne=deleted` |
| `$in` | Dentro de array | `filters.role.$in=admin,moderator` |
| `$nin` | No dentro de array | `filters.role.$nin=guest` |
| `$between` | Entre rango | `filters.age.$between=18,65` |
| `$nbetween` | No entre rango | `filters.age.$nbetween=0,17` |
| `$like` | Like SQL | `filters.name.$like=%test%` |
| `$ilike` | Like case-insensitive (PostgreSQL) | `filters.name.$ilike=%test%` |

## Filtros Múltiples

Puedes combinar múltiples filtros:

```bash
GET /api/users/?filters.active=true&filters.role=admin
GET /api/products/?filters.category=electronics&filters.price.$gte=100
```

## Filtros en POST (Body)

Para búsquedas avanzadas, puedes enviar filtros en el cuerpo de la petición POST usando objetos:

```bash
POST /api/users/
Content-Type: application/json

{
  "filters": {
    "active": true,
    "age": { "$gte": 18, "$lt": 65 },
    "role": ["admin", "moderator"]
  },
  "orderBy": { "created_at": "desc" },
  "limit": 50,
  "page": 0
}
```

## Búsqueda de Texto (q)

El parámetro `q` busca en todas las columnas de texto:

```bash
GET /api/users/?q=john
GET /api/products/?q=laptop
```

## Ordenación (orderBy)

```bash
# Orden ascendente
GET /api/users/?orderBy=name

# Orden descendente
GET /api/users/?orderBy=created_at:desc

# Múltiples columnas
GET /api/users/?orderBy=role:asc,name:desc
```

## Paginación

```bash
GET /api/users/?limit=10&page=0
GET /api/users/?limit=20&page=2
```

## Actualización de Registros (PATCH)

### PATCH /api/<tabla>/:id
Actualiza un registro específico por su ID:

```bash
PATCH /api/users/123
Content-Type: application/json

{
  "name": "John Updated",
  "email": "john.updated@example.com",
  "age": 31
}
```

### PATCH /api/<tabla>/ (lote)
Actualiza múltiples registros a la vez:

```bash
PATCH /api/users/
Content-Type: application/json

{
  "update": [
    { "id": 1, "name": "Updated 1" },
    { "id": 2, "name": "Updated 2" }
  ]
}
```

## Eliminación de Registros (DELETE)

### DELETE /api/<tabla>/:id
Elimina un registro específico:

```bash
DELETE /api/users/123
```

### DELETE /api/<tabla>/ (lote)
Elimina múltiples registros usando filtros:

```bash
DELETE /api/users/?filters.active=false
```