# Data Entry Gen

A full-stack .NET application for generating data entry frontends for existing databases or data sources. This project enables you to extend databases by adding new tables or columns and automatically adjust the UI accordingly.

## Project Structure

```
data-entry-gen/
├── DataEntryGen.slnx              # Solution file
├── src/
│   ├── DataEntryGen.AppHost/      # .NET Aspire orchestration host
│   ├── DataEntryGen.Backend/      # ASP.NET Core 10 Web API backend
│   └── DataEntryGen.Frontend/     # Blazor 10 WebAssembly frontend
└── README.md
```

## Prerequisites

- .NET 10 SDK (verified: 10.0.103)
- Docker (for running PostgreSQL via Aspire)
- A suitable IDE (Visual Studio, Visual Studio Code with C# extension, or JetBrains Rider)

## Projects

### AppHost - DataEntryGen.AppHost
**Technology:** .NET Aspire (Orchestration Host)  
**Location:** `src/DataEntryGen.AppHost/`

Responsibilities:
- Orchestrates all services (Backend, Frontend, Database)
- Manages PostgreSQL instance for development/testing
- Service discovery and configuration
- Health monitoring of all services

### Backend - DataEntryGen.Backend
**Technology:** ASP.NET Core 10 Web API  
**Location:** `src/DataEntryGen.Backend/`

Responsibilities:
- Database schema introspection and analysis
- CRUD API endpoints for data entry
- Schema modification endpoints (adding tables/columns)
- Authentication and authorization
- Data validation and business logic
- PostgreSQL database integration via EF Core

### Frontend - DataEntryGen.Frontend
**Technology:** Blazor 10 WebAssembly  
**Location:** `src/DataEntryGen.Frontend/`

Responsibilities:
- Dynamic UI generation based on database schema
- Data entry forms and tables
- UI customization for new tables and columns
- Real-time communication with backend API
- User-friendly data management interface

## Getting Started

### Running with Aspire (Recommended)

Aspire automatically orchestrates the Backend, Frontend, and PostgreSQL database. This is the recommended way to run the application during development.

**Prerequisites:**
- Docker must be running
- .NET Aspire requires .NET 8 or higher

From the project root:

```bash
# Run the Aspire host (orchestrates all services)
cd src/DataEntryGen.AppHost
dotnet run
```

This will:
- Start the PostgreSQL database container
- Start the Backend API (https://localhost:5001)
- Start the Frontend Blazor WASM (https://localhost:5002)
- Provide the Aspire dashboard for monitoring (typically at https://localhost:17360)

### Running Individual Projects

If you prefer to run projects separately without Aspire:

#### Backend Only

```bash
cd src/DataEntryGen.Backend
dotnet run
```

The API will be available at `https://localhost:5001`

#### Frontend Only

```bash
cd src/DataEntryGen.Frontend
dotnet run
```

The Blazor app will be available at `https://localhost:5002`

**Note:** Running without Aspire requires manual PostgreSQL setup and environment configuration.

### Building the Solution

```bash
# Build the entire solution
dotnet build

# Build in Release mode
dotnet build --configuration Release
```

## Database Setup

### With Aspire

When running via Aspire, PostgreSQL is automatically started and the database connection is configured. No manual setup required.

### Manual Setup

If you need to set up PostgreSQL manually:

1. Install PostgreSQL locally or use Docker:
   ```bash
   docker run --name dataentry-postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:latest
   ```

2. Create the database:
   ```bash
   createdb -U postgres -h localhost dataentrygendb
   ```

3. Update the Backend connection string in `appsettings.json`:
   ```json
   {
     "ConnectionStrings": {
       "dataentrygendb": "Host=localhost;Port=5432;Database=dataentrygendb;Username=postgres;Password=password"
     }
   }
   ```

4. Run migrations:
   ```bash
   cd src/DataEntryGen.Backend
   dotnet ef database update
   ```

## Development

### Adding NuGet Packages

```bash
# Add to Backend
cd src/DataEntryGen.Backend
dotnet add package <PackageName>

# Add to Frontend
cd src/DataEntryGen.Frontend
dotnet add package <PackageName>

# Add to AppHost
cd src/DataEntryGen.AppHost
dotnet add package <PackageName>
```

### Creating Database Migrations

```bash
cd src/DataEntryGen.Backend

# Create a new migration
dotnet ef migrations add MigrationName

# Update the database
dotnet ef database update

# Revert to previous migration
dotnet ef database update PreviousMigrationName
```

### Project Restoration

To restore all dependencies:

```bash
dotnet restore
```

## Configuration

### Backend Configuration
- **appsettings.json**: Default configuration
- **appsettings.Development.json**: Development-specific settings
- **Database Connection**: Automatically configured by Aspire when using AppHost

Key settings to customize:
- Database connection string
- API CORS policy
- Authentication settings
- API versioning

### Frontend Configuration
Configuration is handled in `src/DataEntryGen.Frontend/Program.cs`:
- API base URL (currently set to `https://localhost:5001`)
- HttpClient setup
- Service registration

## Architecture Overview

### Data Flow
1. Frontend (Blazor WASM) submits requests to Backend (Web API)
2. Backend introspects database schema and processes requests
3. Backend returns schema metadata and data to Frontend
4. Frontend dynamically generates UI based on schema

### Technology Stack
- **Runtime:** .NET 10
- **Backend Framework:** ASP.NET Core 10
- **Frontend Framework:** Blazor WebAssembly 10
- **ORM:** Entity Framework Core 10
- **Database:** PostgreSQL
- **Orchestration:** .NET Aspire

### Key Features to Implement
- [ ] Database schema introspection service
- [ ] Dynamic form generation from schema
- [ ] Table/Column management endpoints
- [ ] UI builder based on schema changes
- [ ] Data validation pipeline
- [ ] User authentication/authorization
- [ ] Audit logging

## Troubleshooting

### "Docker is not running" error
Make sure Docker Desktop is running before starting Aspire:
```bash
# On macOS
open /Applications/Docker.app

# On Windows
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### Database connection errors
1. Verify PostgreSQL is running (via Docker or locally)
2. Check connection string in appsettings.json
3. Ensure the database exists and is accessible

### Port already in use
If ports 5001, 5002, or 5432 are already in use:
1. Stop the service using those ports
2. Or modify the port configuration in the AppHost

### Aspire dashboard not accessible
- The dashboard is typically available at `https://localhost:17360`
- Check the console output for the actual URL
- Ensure no firewall blocks the connection

## Next Steps

1. Set up database schema and EF Core migrations
2. Create data access layer with repository pattern
3. Implement schema introspection service
4. Build API endpoints for schema metadata
5. Create Blazor components for dynamic forms
6. Implement UI generation service
7. Add authentication and authorization
8. Implement audit logging

## Resources

- [ASP.NET Core Documentation](https://docs.microsoft.com/en-us/aspnet/core/)
- [Blazor Documentation](https://docs.microsoft.com/en-us/aspnet/core/blazor/)
- [Entity Framework Core](https://docs.microsoft.com/en-us/ef/core/)
- [.NET Aspire Documentation](https://learn.microsoft.com/en-us/dotnet/aspire/)

## License

[Add your license here]
