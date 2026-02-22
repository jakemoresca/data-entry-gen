# Data Entry Gen - Architecture

## System Design

The Data Entry Gen project follows a modern full-stack architecture with clear separation of concerns between frontend and backend.

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                              │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   Blazor WebAssembly Frontend                        │   │
│  │   - Dynamic UI Components                            │   │
│  │   - Form Generation Engine                           │   │
│  │   - Data Validation (Client-side)                    │   │
│  │   - State Management                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                    │
│                  HTTPS + REST API                             │
│                          │                                    │
└──────────────────────────┼────────────────────────────────────┘
                           │
┌──────────────────────────────────────────────────────────────┐
│                    Application Server                         │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   ASP.NET Core 10 Web API Backend                   │   │
│  │                                                      │   │
│  │  ┌────────────────────────────────────────────┐    │   │
│  │  │  API Controllers                           │    │   │
│  │  │  - Schema Introspection                    │    │   │
│  │  │  - CRUD Operations                         │    │   │
│  │  │  - Schema Modification                     │    │   │
│  │  └────────────────────────────────────────────┘    │   │
│  │                      │                              │   │
│  │  ┌────────────────────────────────────────────┐    │   │
│  │  │  Business Logic & Services                 │    │   │
│  │  │  - Database Schema Analyzer                │    │   │
│  │  │  - Data Validation Rules                   │    │   │
│  │  │  - Authorization Service                   │    │   │
│  │  └────────────────────────────────────────────┘    │   │
│  │                      │                              │   │
│  │  ┌────────────────────────────────────────────┐    │   │
│  │  │  Data Access Layer (EF Core)              │    │   │
│  │  │  - DbContext                              │    │   │
│  │  │  - Migrations                             │    │   │
│  │  └────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                    │
│                   Database Driver                             │
│                          │                                    │
└──────────────────────────┼────────────────────────────────────┘
                           │
┌──────────────────────────────────────────────────────────────┐
│                     Database Server                           │
│                                                               │
│  - SQL Server / PostgreSQL / MySQL / SQLite                  │
│  - Dynamic Schema                                            │
│  - User Data                                                 │
└──────────────────────────────────────────────────────────────┘
```

## Key Components

### Backend (ASP.NET Core 10)

#### API Layer
- RESTful endpoints for all operations
- Request/Response DTOs
- Error handling and status codes
- CORS configuration for cross-origin requests

#### Business Logic Layer
- **SchemaIntrospectionService**: Analyzes database metadata
- **DataValidationService**: Enforces data rules
- **DataEntryService**: CRUD operations
- **SchemaModificationService**: Handles table/column additions

#### Data Access Layer
- Entity Framework Core 10
- Database migrations
- Query optimization
- Connection pooling

### Frontend (Blazor WebAssembly)

#### Components
- **SchemaViewer**: Displays database structure
- **FormGenerator**: Creates forms dynamically from schema
- **DataGrid**: Displays tabular data
- **SchemaBuilder**: UI for modifying schema

#### Services
- **ApiClient**: HTTP communication service
- **SchemaService**: Schema metadata management
- **FormBuilder**: Dynamic form creation logic
- **StateService**: Application state management

## Data Flow

### Viewing Data Entry Forms
```
1. User navigates to data entry page
   ↓
2. Frontend requests schema metadata from Backend
   ↓
3. Backend queries database and returns schema info
   ↓
4. Frontend FormGenerator creates UI components
   ↓
5. User sees dynamic form matching database schema
```

### Adding New Table/Column
```
1. User submits schema modification request
   ↓
2. Frontend sends modification to Backend API
   ↓
3. Backend validates modification
   ↓
4. Backend creates migration and updates database
   ↓
5. Frontend refreshes schema cache
   ↓
6. UI automatically updates to show new fields
```

## API Contracts

### Schema Endpoints
- `GET /api/schema` - Get full database schema
- `GET /api/schema/tables` - Get all tables
- `GET /api/schema/tables/{name}` - Get specific table structure
- `POST /api/schema/tables` - Create new table
- `POST /api/schema/tables/{name}/columns` - Add column

### Data Endpoints
- `GET /api/data/{table}` - Get all records
- `GET /api/data/{table}/{id}` - Get specific record
- `POST /api/data/{table}` - Create record
- `PUT /api/data/{table}/{id}` - Update record
- `DELETE /api/data/{table}/{id}` - Delete record

## Technologies

### Backend
- **.NET 10**
- **ASP.NET Core 10**
- **Entity Framework Core 10**
- **C# 13**

### Frontend
- **Blazor WebAssembly 10**
- **.NET 10**
- **C# 13**
- **Razor Components**

## Security Considerations

1. **Authentication**: Implement JWT or Identity
2. **Authorization**: Role-based access control (RBAC)
3. **Input Validation**: Both client and server-side
4. **CORS**: Configured for specific origins
5. **HTTPS**: Required for all communications
6. **SQL Injection Prevention**: EF Core parameterized queries
7. **Data Validation**: Runtime schema validation

## Performance Optimizations

1. **Caching**: Schema metadata caching
2. **Lazy Loading**: Component and data lazy loading
3. **Pagination**: Large dataset pagination
4. **Indexing**: Database indexes on frequently queried columns
5. **Async Operations**: Async/await throughout

## Future Enhancements

- [ ] Multi-tenancy support
- [ ] Custom field types and validators
- [ ] Audit logging and change tracking
- [ ] Advanced filtering and search
- [ ] Bulk operations
- [ ] CSV/Excel import/export
- [ ] Workflow automation
- [ ] Dashboard and analytics
- [ ] Mobile app frontend
- [ ] GraphQL API option
