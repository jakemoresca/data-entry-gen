# Aspire Setup Guide

## Overview

.NET Aspire is a cloud-native development stack designed to make working with distributed applications easier. In this project, Aspire orchestrates three main components:

1. **Backend API** (ASP.NET Core)
2. **Frontend** (Blazor WebAssembly)  
3. **Database** (PostgreSQL)

## Prerequisites

Before running Aspire, ensure you have:

- .NET 10 SDK or later
- Docker Desktop (or any OCI-compliant container runtime)
- 8GB+ RAM recommended
- Internet connection (for downloading container images)

### Verify Installation

```bash
# Check .NET version
dotnet --version

# Verify Docker is running
docker version

# List .NET Aspire packages
dotnet package search Aspire --exact-match
```

## Running the Aspire Host

### Start Aspire

```bash
cd src/DataEntryGen.AppHost
dotnet run
```

### What Happens

When you run the Aspire host, it will:

1. **Start PostgreSQL Container**
   - Creates a PostgreSQL container with the name `postgres`
   - Exposes port 5432
   - Admin UI (PgAdmin) available at `https://localhost:5050`

2. **Create Database**
   - Creates a database named `dataentrygendb`
   - Automatically applies any pending EF Core migrations

3. **Start Backend API**
   - Listens on `https://localhost:5001`
   - Connects to PostgreSQL via Aspire service discovery
   - Implements CORS for the Frontend

4. **Start Frontend Blazor App**
   - Listens on `https://localhost:5002`
   - Configured to call Backend at `https://localhost:5001`
   - Provides data entry interface

5. **Launch Aspire Dashboard**
   - Monitoring console for all services
   - Resource usage tracking
   - Logs and diagnostics
   - Typically available at `https://localhost:17360`

## First Run Checklist

- [ ] Docker is running
- [ ] No process is using ports 5001, 5002, 5050, 5432, 17360
- [ ] You have internet for container image pulls
- [ ] RAM and disk space available

## Accessing the Application

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | https://localhost:5002 | User-facing data entry application |
| Backend | https://localhost:5001 | REST API endpoints |
| PgAdmin | https://localhost:5050 | PostgreSQL administration |
| Aspire Dashboard | https://localhost:17360 | Service orchestration and monitoring |

### Frontend Access

Navigate to: `https://localhost:5002`
- The Blazor application is your main interface
- Dynamically generates forms based on database schema
- Communicates with Backend API

### Backend API Access

The API is at: `https://localhost:5001`

Example endpoints:
```bash
# Health check
curl https://localhost:5001/health

# Try the sample weather endpoint
curl https://localhost:5001/weatherforecast
```

### Database Management

Access PgAdmin:
1. Go to https://localhost:5050
2. Register/login (first time)
3. Connect to PostgreSQL:
   - Host: `postgres` (or `localhost` if connecting from outside container)
   - Port: `5432`
   - Username: `postgres`
   - Database: `dataentrygendb`

## Service Discovery

Aspire provides automatic service discovery. In the Backend code, you can reference other services:

```csharp
// Already configured in Program.cs:
builder.AddNpgsqlDbContext<DataEntryDbContext>("dataentrygendb");

// The "dataentrygendb" name matches what Aspire configures
```

The AppHost configuration:
```csharp
var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin();
var db = postgres.AddDatabase("dataentrygendb");

var backend = builder.AddProject("backend", "../DataEntryGen.Backend/DataEntryGen.Backend.csproj")
    .WithReference(db);  // Injects database connection info
```

## Common Tasks

### View Service Logs

In the Aspire Dashboard:
1. Navigate to Resources tab
2. Click on the service name
3. View real-time logs

Or in the terminal running AppHost, logs are displayed as services interact.

### Stop All Services

Press `Ctrl+C` in the terminal running the Aspire host.

### Restart a Service

In Aspire Dashboard:
1. Go to Resources
2. Find the service
3. Click the restart icon

### View Environment Variables

Aspire automatically sets environment variables for service discovery. View them in the Dashboard under each resource's properties.

### Persist Data Between Runs

PostgreSQL data is stored in a Docker volume. To preserve data:
- Data persists across Aspire runs
- To reset: Delete the Docker volume or use `docker volume prune`

## Troubleshooting

### Docker Connection Failed

**Error:** `Cannot connect to Docker daemon`

**Solution:**
- Start Docker Desktop (macOS/Windows)
- On Linux, ensure Docker daemon is running: `sudo systemctl start docker`

### Port Already in Use

**Error:** `Port 5001 is already in use`

**Solution:**
1. Find the process: `lsof -i :5001` (macOS/Linux) or `netstat -ano | findstr :5001` (Windows)
2. Kill the process or use a different port
3. Or modify the AppHost to use different ports:

```csharp
.WithHttpsEndpoint(port: 5011, name: "https")
```

### Database Connection Refused

**Error:** `psql: error: could not connect to server`

**Solution:**
- Ensure PostgreSQL container is running: `docker ps | grep postgres`
- Check if port 5432 is accessible
- Verify the connection string includes correct host/port
- Wait a few seconds for PostgreSQL to fully start

### Out of Disk Space

**Error:** `no space left on device`

**Solution:**
```bash
# Clean up Docker resources
docker system prune -a

# Remove unused volumes
docker volume prune
```

### Can't Access Aspire Dashboard

**Issue:** Dashboard URL is incorrect or inaccessible

**Solution:**
1. Check the console output when AppHost starts - it shows the actual URL
2. Dashboard URL is usually `https://localhost:17360`
3. Ensure firewall allows the connection
4. Try accessing from the machine running Aspire, not over network

## Performance Tuning

### Docker Resource Limits

If Aspire runs slowly:

1. **Increase Docker Resources:**
   - Open Docker Desktop Settings
   - Go to Resources
   - Increase CPU and Memory allocations

2. **Default Recommendations:**
   - CPU: At least 4 cores
   - Memory: At least 8GB (4GB minimum)
   - Disk: 20GB+ available space

### Database Optimization

For better performance:
- Use indexed queries in your code
- Implement caching where appropriate
- Use pagination for large datasets

## Advanced Configuration

### Custom Port Binding

Modify `src/DataEntryGen.AppHost/Program.cs`:

```csharp
var backend = builder.AddProject("backend", "../DataEntryGen.Backend/DataEntryGen.Backend.csproj")
    .WithReference(db)
    .WithHttpsEndpoint(port: 5001, name: "https");  // Change 5001 to your port
```

### Environment Variables

Pass environment variables to services:

```csharp
var backend = builder.AddProject("backend", "../DataEntryGen.Backend/DataEntryGen.Backend.csproj")
    .WithReference(db)
    .WithEnvironment("ENVIRONMENT", "Development");  // Add custom env vars
```

### PostgreSQL Customization

Customize PostgreSQL behavior:

```csharp
var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin()
    .WithEnvironment("POSTGRES_HOST_AUTH_METHOD", "trust");  // Custom settings
```

## Best Practices

1. **Always start Docker before Aspire**
   - Prevents connection errors

2. **Monitor resources in Dashboard**
   - Watch CPU and memory usage
   - Check logs for errors

3. **Use .gitignore for sensitive data**
   - Don't commit connection strings
   - Aspire injects these automatically anyway

4. **Restart services via Dashboard**
   - Better than stopping/starting AppHost
   - Faster feedback loop

5. **Keep Docker images updated**
   - Periodically: `docker pull postgres:latest`
   - Ensures security patches are applied

## Next Steps

1. Verify all services start successfully
2. Access the Frontend at https://localhost:5002
3. Review the Aspire Dashboard for monitoring
4. Create your first database tables in EF Core migrations
5. Build your data entry forms in the Frontend

## Resources

- [.NET Aspire Documentation](https://learn.microsoft.com/en-us/dotnet/aspire/)
- [Aspire GitHub Repository](https://github.com/dotnet/aspire)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
