# ADBA Postman Collection

Esta es una colección genérica de Postman para **ADBA (Any Database to API)** que incluye todos los endpoints disponibles con variables configurables.

## 🚀 Configuración Rápida

### Opción 1: Colección Genérica (Recomendada)
1. Importa `postman-collection.json` - funciona para cualquier tabla
2. Configura las variables de entorno
3. Cambia `tableName` según necesites

### Opción 2: Generador Automático
Genera una colección personalizada para una tabla específica:

```bash
# Generar colección para tabla 'users'
npm run postman:users

# Generar colección para tabla 'products'  
npm run postman:products

# Generar colección personalizada
node generate-postman.js mi-tabla http://localhost:3000/api
```

Esto crea un archivo `postman-mi-tabla-collection.json` preconfigurado.

### 1. Importar la Colección
1. Abre Postman
2. Click en "Import"
3. Selecciona el archivo `postman-collection.json`
4. La colección se importará con el nombre "ADBA - Any Database to API"

### 2. Configurar Variables de Entorno
Una vez importada, configura estas variables:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `baseUrl` | URL base de tu API ADBA | `http://localhost:3000/api` |
| `tableName` | Nombre de la tabla a probar | `users`, `products`, `orders` |
| `recordId` | ID de un registro específico | `1`, `123` |
| `recordName` | Nombre de un registro específico | `john-doe`, `admin` |

#### Configurar Variables:
1. En Postman, ve a "Environments"
2. Crea un nuevo environment (ej: "ADBA Local")
3. Agrega las variables mencionadas arriba
4. Selecciona el environment antes de usar la colección

### 3. ¡Empezar a Probar!
- Todas las requests usan las variables configuradas
- Solo cambia el valor de `tableName` para probar diferentes tablas
- La colección se adapta automáticamente a cualquier esquema de base de datos

## 📁 Estructura de la Colección

### 📋 List Records (GET)
- **List All Records**: Lista todos los registros con paginación por defecto
- **List with Pagination**: Control personalizado de paginación
- **List with Filters**: Filtrado por campos específicos
- **List with Search**: Búsqueda de texto libre en campos string
- **List with Ordering**: Ordenamiento personalizado

### 📋 List Records (POST)
- **List with POST Body**: Misma funcionalidad pero con parámetros en el body

### 🔍 Get by ID
- **Get Record by ID**: Obtiene un registro específico por su ID numérico

### 🔍 Get by Name ⭐ **NUEVO**
- **Get Record by Name**: Obtiene un registro por su campo name (funcionalidad recién agregada)

### ➕ Create Records
- **Create Single Record**: Crea un registro individual
- **Create Multiple Records**: Crea múltiples registros en una sola request

### ✏️ Update Records
- **Update Single Record**: Actualiza un registro
- **Update Record by ID**: Actualiza un registro específico por ID
- **Update Multiple Records**: Actualiza múltiples registros

### 🗑️ Delete Records
- **Delete Record by ID**: Elimina un registro por ID
- **Delete Multiple Records**: Elimina múltiples registros

### ℹ️ Meta Information
- **Get Table Metadata**: Obtiene información del esquema de la tabla
- **List All Available Routes**: Lista todos los endpoints disponibles

## 💡 Ejemplos de Uso

### Configuración Típica:
```
baseUrl: http://localhost:3000/api
tableName: users
recordId: 1
recordName: john-doe
```

### Probar Diferentes Tablas:
1. Cambia `tableName` a `products`
2. Todas las requests se actualizan automáticamente
3. Prueba endpoints como:
   - `GET /products/` - Lista productos
   - `GET /products/laptop-dell` - Busca producto por nombre
   - `GET /products/meta` - Info del esquema de productos

## 🔧 Personalización

### Modificar Requests:
- Los cuerpos de las requests son plantillas genéricas
- Modifica los campos JSON según tu esquema de base de datos
- Las variables se resuelven automáticamente

### Filtros Personalizados:
```
GET /{{tableName}}/?filters[status]=active&filters[category]=electronics
```

### Búsquedas Personalizadas:
```
GET /{{tableName}}/?q=search-term&limit=20&orderBy[created_at]=desc
```

## 🌟 Características Especiales

### Auto-configuración:
- La colección detecta automáticamente si no hay variables configuradas
- Establece valores por defecto para empezar rápidamente

### Documentación Integrada:
- Cada request incluye descripción detallada
- Ejemplos de uso en las descripciones
- Explicación de parámetros y opciones

### Compatibilidad Total:
- Funciona con cualquier base de datos soportada por ADBA
- SQLite, MySQL, PostgreSQL, MSSQL
- Se adapta automáticamente al esquema de tu base de datos

## 🚦 Códigos de Respuesta

### Éxito:
- `200 OK`: Operación exitosa
- `201 Created`: Recurso creado

### Errores:
- `404 Not Found`: Registro no encontrado
- `500 Internal Server Error`: Error del servidor

### Estructura de Respuesta:
```json
{
  "success": true,
  "error": false,
  "status": 200,
  "code": 0,
  "description": "ok",
  "data": { ... }
}
```

## 🤝 Contribuir

Si encuentras algún endpoint faltante o quieres mejorar la colección:
1. Edita el archivo `postman-collection.json`
2. Prueba los cambios
3. Envía un pull request

---

**¡Happy Testing con ADBA! 🚀**