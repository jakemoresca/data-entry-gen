# Generic Database Architecture

## Overview

The backend is now completely **schema-agnostic** and **model-free**. It discovers tables from ANY database and automatically generates CRUD endpoints without any hardcoded models or migrations.

## Architecture

### Key Principles

1. **No Hardcoded Models** - Models are discovered dynamically from the database schema
2. **Generic CRUD Operations** - All operations work with dynamic dictionaries/JSON
3. **Schema Discovery** - Tables and columns are introspected at request time
4. **Dynamic Endpoints** - RESTful endpoints work with any table name

### Project Structure

```
src/DataEntryGen.Backend/
├── Data/
│   └── DataEntryDbContext.cs         # Generic DbContext (no models)
├── Services/
│   ├── SchemaDiscoveryService.cs     # Database schema introspection
│   └── GenericDataService.cs         # Generic CRUD operations
└── Program.cs                         # Dynamic endpoint registration
```

## Components

### 1. SchemaDiscoveryService

**Purpose:** Discovers database tables and their metadata

**Key Methods:**
- `DiscoverTablesAsync()` - List all tables in the database
- `GetTableSchemaAsync(tableName)` - Get columns and metadata for a table

**Returns:**
```csharp
public class TableInfo
{
    public string Name { get; set; }
    public List<ColumnInfo> Columns { get; set; }
}

public class ColumnInfo
{
    public string Name { get; set; }
    public string DataType { get; set; }
    public bool IsNullable { get; set; }
    public bool IsPrimaryKey { get; set; }
}
```

**Example Usage:**
```csharp
var tables = await schemaService.DiscoverTablesAsync();
// Output: [
//   { Name: "users", Columns: [...] },
//   { Name: "posts", Columns: [...] },
//   { Name: "comments", Columns: [...] }
// ]
```

### 2. GenericDataService

**Purpose:** Performs CRUD operations on any table using dynamic objects

**Key Methods:**
- `GetAllRecordsAsync(tableName)` - Select all records
- `GetRecordByPrimaryKeyAsync(tableName, id)` - Select by primary key
- `InsertRecordAsync(tableName, data)` - Insert new record
- `UpdateRecordAsync(tableName, data)` - Update existing record
- `DeleteRecordAsync(tableName, id)` - Delete record
- `GetPrimaryKeyColumnAsync(tableName)` - Discover primary key

**Data Format:**
```csharp
// All data is passed as Dictionary<string, object?>
var record = new Dictionary<string, object?>
{
    { "id", "abc-123" },
    { "name", "John Doe" },
    { "email", "john@example.com" },
    { "created_at", DateTime.UtcNow }
};
```

**Security:**
- Parameterized queries (prevents SQL injection)
- Table name validation (alphanumeric + underscores only)

## API Endpoints

### Schema Discovery

**Get All Tables**
```
GET /api/schema/tables
Response: [
  { name: "users", columns: [...] },
  { name: "posts", columns: [...] }
]
```

**Get Table Schema**
```
GET /api/schema/tables/{tableName}
Response: {
  name: "users",
  columns: [
    { name: "id", dataType: "uuid", isPrimaryKey: true, isNullable: false },
    { name: "email", dataType: "text", isPrimaryKey: false, isNullable: false },
    { name: "name", dataType: "text", isPrimaryKey: false, isNullable: true }
  ]
}
```

### Generic CRUD Operations

**Get All Records**
```
GET /api/data/{tableName}
Example: GET /api/data/users
Response: [
  { id: "abc-123", name: "John", email: "john@example.com" },
  { id: "def-456", name: "Jane", email: "jane@example.com" }
]
```

**Get Single Record**
```
GET /api/data/{tableName}/{id}
Example: GET /api/data/users/abc-123
Response: { id: "abc-123", name: "John", email: "john@example.com" }
```

**Create Record**
```
POST /api/data/{tableName}
Content-Type: application/json

{
  "name": "Alice",
  "email": "alice@example.com"
}
```

**Update Record**
```
PUT /api/data/{tableName}
Content-Type: application/json

{
  "id": "abc-123",
  "name": "John Updated",
  "email": "john.new@example.com"
}
```

**Delete Record**
```
DELETE /api/data/{tableName}/{id}
Example: DELETE /api/data/users/abc-123
```

## Workflow

### On Backend Startup

1. ✅ DbContext initializes connection to database
2. ✅ Services are registered (SchemaDiscoveryService, GenericDataService)
3. ✅ Generic endpoints are mapped
4. ✅ **No migrations are applied** - schema must exist in database

### When Client Requests Data

**Example: Get all users**
```
GET /api/data/users
  ↓
Backend calls GenericDataService.GetAllRecordsAsync("users")
  ↓
Service executes: SELECT * FROM "users"
  ↓
Results converted to Dictionary<string, object?>
  ↓
Returns as JSON array
```

**Example: Create new post**
```
POST /api/data/posts
{ "title": "Hello", "content": "World" }
  ↓
GenericDataService.InsertRecordAsync("posts", data)
  ↓
Service discovers columns and inserts with parameters
  ↓
SQL: INSERT INTO "posts" ("title", "content") VALUES (@p0, @p1)
```

## Database Schema Requirements

The backend requires tables to already exist in the database. It will work with ANY table structure:

### Minimal Required Setup

1. Create your tables in PostgreSQL
2. Start the backend - it auto-discovers them
3. Use the generic CRUD endpoints

### Example: Creating Tables in PostgreSQL

```sql
-- Create users table
CREATE TABLE "users" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create posts table
CREATE TABLE "posts" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

Then immediately:
```bash
# Get schema
curl https://localhost:5001/api/schema/tables

# Get all users
curl https://localhost:5001/api/data/users

# Create a post
curl -X POST https://localhost:5001/api/data/posts \
  -H "Content-Type: application/json" \
  -d '{"user_id":"...", "title":"Hello", "content":"World"}'
```

## Features

✅ **No Model Generation** - Works with any table  
✅ **Dynamic Schema Discovery** - Reads metadata from database  
✅ **Generic CRUD** - Insert/Update/Delete/Select all tables  
✅ **SQL Injection Prevention** - Parameterized queries  
✅ **Table Name Validation** - Only alphanumeric + underscores  
✅ **Primary Key Auto-Detection** - Finds PK automatically  
✅ **Nullable Column Support** - Handles NULL values  
✅ **Multi-type Support** - Works with any data type  
✅ **RESTful Endpoints** - Standard HTTP verbs  
✅ **OpenAPI Documentation** - Full endpoint docs  

## Limitations & Considerations

1. **Schema Must Pre-Exist** - Backend doesn't create tables
2. **Primary Key Required** - For update/delete operations
3. **No Relationships** - Foreign keys aren't automatically traversed
4. **No Complex Queries** - No joins, filtering, sorting yet (v1)
5. **Single Primary Key** - Composite keys not yet supported

## Future Enhancements

- [ ] Filtering and sorting
- [ ] Join support
- [ ] Aggregation functions
- [ ] Full-text search
- [ ] Pagination
- [ ] Complex query builder
- [ ] Stored procedure support
- [ ] Soft deletes

## Example: Complete Workflow

### 1. Create Database Schema

```sql
CREATE TABLE "departments" (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE "todos" (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    department_id UUID NOT NULL REFERENCES departments(id)
);
```

### 2. Start Backend with Aspire

```bash
cd src/DataEntryGen.AppHost
dotnet run
```

### 3. Discover Schema

```bash
curl https://localhost:5001/api/schema/tables
```

Response:
```json
[
  {
    "name": "departments",
    "columns": [
      { "name": "id", "dataType": "uuid", "isPrimaryKey": true, "isNullable": false },
      { "name": "name", "dataType": "text", "isPrimaryKey": false, "isNullable": false },
      { "name": "description", "dataType": "text", "isPrimaryKey": false, "isNullable": true }
    ]
  },
  {
    "name": "todos",
    "columns": [...]
  }
]
```

### 4. Create a Department

```bash
curl -X POST https://localhost:5001/api/data/departments \
  -H "Content-Type: application/json" \
  -d '{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Engineering",
    "description": "Engineering Department"
  }'
```

### 5. Create a Todo

```bash
curl -X POST https://localhost:5001/api/data/todos \
  -H "Content-Type: application/json" \
  -d '{
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "Create a data entry app",
    "description": "Build full-stack app",
    "department_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### 6. Query All Todos

```bash
curl https://localhost:5001/api/data/todos
```

### 7. Update a Todo

```bash
curl -X PUT https://localhost:5001/api/data/todos \
  -H "Content-Type: application/json" \
  -d '{
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "name": "Create a data entry app (Updated)",
    "description": "Build full-stack app with Blazor"
  }'
```

### 8. Delete a Todo

```bash
curl -X DELETE https://localhost:5001/api/data/todos/660e8400-e29b-41d4-a716-446655440000
```

## Testing with cURL

All endpoints support standard HTTP methods and JSON payloads.

```bash
# Health check
curl https://localhost:5001/api/ping

# Get all endpoints in OpenAPI
curl https://localhost:5001/openapi/v1.json

# Interactive Swagger UI
# Open: https://localhost:5001/swagger
```

## Security Notes

⚠️ **Development Only:**
- The `/api/admin/reset-data` endpoint has no authentication
- Generic endpoints have no authorization
- All operations are allowed on all tables

**For Production:**
- Add authentication (~JWT, API keys)
- Implement authorization (role-based table access)
- Validate data types and formats
- Audit all operations
- Rate limiting
- Use read-only role for GET operations

## Summary

🎯 **Goal Achieved:** A completely generic backend that:
- ✅ Discovers database schema automatically
- ✅ Generates CRUD endpoints for all tables
- ✅ Works with any table structure
- ✅ Requires no model definitions
- ✅ Requires no migrations
- ✅ Adapts to schema changes automatically

The backend is now **schema-driven** instead of **model-driven**!
