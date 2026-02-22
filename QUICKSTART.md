# Quick Start Guide

Get the Data Entry Gen application running in 5 minutes!

## Prerequisites Checklist

- [ ] .NET 10 SDK installed
- [ ] Docker Desktop installed and running
- [ ] 8GB+ RAM available
- [ ] Ports available: 5001, 5002, 5050, 5432, 17360

## Quick Start: Run Everything with Aspire

### 1. Navigate to the AppHost

```bash
cd src/DataEntryGen.AppHost
```

### 2. Start Aspire

```bash
dotnet run
```

**What you'll see:**
- PostgreSQL container starting
- Backend API starting on port 5001
- Frontend Blazor app starting on port 5002
- Aspire Dashboard launching on port 17360

### 3. Access the Application

Open these in your browser:

| URL | Purpose |
|-----|---------|
| https://localhost:5002 | **Frontend** - Main data entry application |
| https://localhost:5001 | Backend API endpoints |
| https://localhost:5050 | PgAdmin - Database management |
| https://localhost:17360 | Aspire Dashboard - Service monitoring |

### 4. Try It Out

1. Go to https://localhost:5002
2. You'll see the Blazor frontend with a sample "Weather Forecast" page
3. Go to https://localhost:5001/weatherforecast to see API response
4. Check Aspire Dashboard at https://localhost:17360 to see all services

### 5. Stop Everything

Press `Ctrl+C` in the terminal running the AppHost.

## Project Structure

```
data-entry-gen/
├── DataEntryGen.slnx                          # Solution file
├── src/
│   ├── DataEntryGen.AppHost/                  # Aspire orchestrator
│   │   ├── Program.cs                         # Configures all services
│   │   └── DataEntryGen.AppHost.csproj
│   │
│   ├── DataEntryGen.Backend/                  # ASP.NET Core Web API
│   │   ├── Program.cs                         # Backend configuration
│   │   ├── Data/
│   │   │   └── DataEntryDbContext.cs         # EF Core DbContext
│   │   ├── Properties/
│   │   ├── appsettings.json
│   │   └── DataEntryGen.Backend.csproj
│   │
│   └── DataEntryGen.Frontend/                 # Blazor WASM
│       ├── Program.cs                         # Frontend configuration
│       ├── App.razor                          # Root component
│       ├── Pages/                             # Razor pages
│       ├── Layout/                            # Layout components
│       ├── wwwroot/                           # Static files
│       └── DataEntryGen.Frontend.csproj
│
├── README.md                                   # Main documentation
├── ASPIRE_SETUP.md                            # Detailed Aspire guide
├── ARCHITECTURE.md                            # System architecture
└── .gitignore
```

## AppHost Configuration

The AppHost (`src/DataEntryGen.AppHost/Program.cs`) orchestrates:

```csharp
// PostgreSQL database
var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin();                           // Adds admin UI
var db = postgres.AddDatabase("dataentrygendb");

// Backend API
builder.AddProject("backend", "../DataEntryGen.Backend/DataEntryGen.Backend.csproj")
    .WithReference(db)                        // Injects DB connection
    .WithHttpsEndpoint(port: 5001);

// Frontend Blazor
builder.AddProject("frontend", "../DataEntryGen.Frontend/DataEntryGen.Frontend.csproj")
    .WithHttpsEndpoint(port: 5002);
```

## Development Workflow

### Make Changes to Backend

1. Edit files in `src/DataEntryGen.Backend/`
2. Services auto-reload when code changes
3. Check logs in Aspire Dashboard

### Make Changes to Frontend

1. Edit Blazor components in `src/DataEntryGen.Frontend/`
2. Browser auto-refreshes
3. Frontend runs on port 5002

### Modify the Database Schema

1. Edit `src/DataEntryGen.Backend/Data/DataEntryDbContext.cs`
2. Create migration:
   ```bash
   cd src/DataEntryGen.Backend
   dotnet ef migrations add YourMigrationName
   ```
3. Restart Aspire (auto-applies migrations)

## Key Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Orchestration | .NET Aspire | Service management & discovery |
| Backend | ASP.NET Core 10 | REST API |
| Frontend | Blazor WASM 10 | WebAssembly UI |
| Database | PostgreSQL | Data storage |
| ORM | Entity Framework Core 10 | Data access |
| Language | C# 13 | Programming language |

## Accessing PostgreSQL Directly

### Via PgAdmin (GUI)
- URL: https://localhost:5050
- Database: `dataentrygendb`
- Host: `postgres`
- Port: `5432`

### Via psql (Command Line)
```bash
# If PostgreSQL client is installed locally
psql -h localhost -U postgres -d dataentrygendb

# Or use Docker
docker exec -it $(docker ps | grep postgres | awk '{print $1}') psql -U postgres -d dataentrygendb
```

## Troubleshooting

### Services not starting
- Check if Docker is running
- Verify no port conflicts (see Prerequisites)
- Check Aspire Dashboard logs

### Can't connect to API
- Backend must be running on port 5001
- Check CORS is enabled (already configured)
- Verify https://localhost:5001/weatherforecast works

### Database connection error
- PostgreSQL container must be running
- Check Aspire Dashboard for container status
- Verify connection string in Backend

### Slow performance
- Increase Docker resources (CPU/RAM)
- Check Aspire Dashboard resource usage
- Close other applications using resources

## What's Next

1. **Define Your Data Model**
   - Create entity classes in `Backend/Models/`
   - Add DbSets to `DataEntryDbContext`

2. **Create Database Schema**
   - Use EF Core migrations
   - See ASPIRE_SETUP.md for detailed instructions

3. **Build API Endpoints**
   - Add controllers to `Backend/Controllers/`
   - Implement CRUD operations

4. **Create Blazor Components**
   - Build forms in `Frontend/Pages/`
   - Add data entry components in `Frontend/Components/`

5. **Implement Dynamic UI Generation**
   - Create schema introspection service
   - Auto-generate forms based on database

## Documentation

- **README.md** - Complete project overview
- **ASPIRE_SETUP.md** - Detailed Aspire configuration and troubleshooting
- **ARCHITECTURE.md** - System architecture and design patterns

## Common Commands

```bash
# Build entire solution
dotnet build

# Run Aspire host
cd src/DataEntryGen.AppHost && dotnet run

# Create database migration (from Backend directory)
dotnet ef migrations add MigrationName

# View logs for a project
dotnet run --project src/DataEntryGen.Backend

# Clean build artifacts
dotnet clean
```

## Getting Help

Check these files for more information:
- Issues with Aspire? → See ASPIRE_SETUP.md
- Architecture questions? → See ARCHITECTURE.md
- General questions? → See README.md

---

**That's it!** You now have a fully functional full-stack .NET application with database orchestration. Start customizing it for your needs! 🚀
