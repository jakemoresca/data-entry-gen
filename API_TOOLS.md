# API Endpoints & Database Tools

This document describes the new API endpoints and command-line tools available in the Data Entry Gen application.

## Backend API Endpoints

### Health Check / Ping Endpoint

**Endpoint:** `GET /api/ping`

**Description:** Simple health check endpoint to verify the API is running.

**Response:**
```
HTTP Status: 200 OK
Body: "pong"
```

**Example:**
```bash
curl https://localhost:5001/api/ping
```

**cURL with verbose output:**
```bash
curl -v https://localhost:5001/api/ping
```

---

## Admin Endpoints

### Reset All Data

**Endpoint:** `POST /api/admin/reset-data`

**Description:** Deletes all data from all database tables. This is useful for development and testing to reset the database to a clean state.

⚠️ **WARNING:** This is a destructive operation that cannot be undone. It will delete ALL data from ALL tables in the database.

**Response - Success:**
```json
HTTP Status: 200 OK
{
    "message": "All data deleted successfully"
}
```

**Response - Error:**
```json
HTTP Status: 400 Bad Request
{
    "error": "Error message describing what went wrong"
}
```

**Example:**
```bash
curl -X POST https://localhost:5001/api/admin/reset-data
```

**With verbose output:**
```bash
curl -v -X POST https://localhost:5001/api/admin/reset-data
```

**Security Note:** In production, this endpoint should be protected with:
- Authentication (JWT, API Key, etc.)
- Authorization (Admin role only)
- Additional confirmation mechanisms

---

## Command-Line Tools

A separate tool project (`DataEntryGen.Tools`) is available for database management operations. This tool can be run independently to perform operations like resetting data.

### Tool Location

```
src/DataEntryGen.Tools/
```

### Running the Tool

From the Tools directory:

```bash
cd src/DataEntryGen.Tools
dotnet run -- [command] [options]
```

Or from the solution root:

```bash
dotnet run --project src/DataEntryGen.Tools -- [command] [options]
```

### Available Commands

#### 1. Reset Data Command

**Purpose:** Delete all data from all database tables (interactive by default).

**Usage:**
```bash
# Interactive - prompts for confirmation
dotnet run -- reset-data

# Force without confirmation
dotnet run -- reset-data --force

# With custom connection string
dotnet run -- reset-data -c "Host=myhost;Port=5432;Database=mydb;Username=user;Password=pass"

# Force with custom connection string
dotnet run -- reset-data --force -c "Host=myhost;Port=5432;Database=mydb;Username=user;Password=pass"
```

**Aliases:** `reset-data`, `reset`

**Options:**
- `-c, --connection` - PostgreSQL connection string (default: `Host=localhost;Port=5432;Database=dataentrygendb;Username=postgres;Password=postgres`)
- `-f, --force` - Skip confirmation prompt

**Example:**
```bash
dotnet run -- reset-data --force
```

**Output Example:**
```
🗑️  Data Entry Gen - Database Management Tool
==================================================

🗑️  Deleting all database data...
⏳ Connecting to database...
✅ Connected successfully.
⏳ Deleting all data...

  - Truncating: DataEntryEntity
  - Truncating: UserProfile

✅ Successfully deleted all data from 2 table(s).
```

---

#### 2. Database Info Command

**Purpose:** Display database entity information and verify connectivity.

**Usage:**
```bash
# Show database info
dotnet run -- db-info

# With custom connection string
dotnet run -- db-info -c "Host=myhost;Port=5432;Database=mydb;Username=user;Password=pass"
```

**Aliases:** `db-info`, `info`

**Options:**
- `-c, --connection` - PostgreSQL connection string (default: same as above)

**Example:**
```bash
dotnet run -- db-info
```

**Output Example:**
```
🗑️  Data Entry Gen - Database Management Tool
==================================================

📊 Gathering database information...
⏳ Connecting to database...
✅ Connected successfully.

📋 Entity Types: 2
   • UserProfile → user_profiles
   • DataEntryEntity → data_entry_entities

✅ Database is ready.
```

---

#### 3. Help Command

**Purpose:** Display help information about available commands.

**Usage:**
```bash
dotnet run -- help
dotnet run -- -h
dotnet run -- --help
```

**Output:**
```
Usage: dotnet run -- [command] [options]

Available Commands:
  reset-data, reset    Delete all database data
  db-info, info        Show database entity information
  help, -h, --help     Show this help message

Options:
  -c, --connection     PostgreSQL connection string
  -f, --force          Skip confirmation prompt

Examples:
  dotnet run -- reset-data
  dotnet run -- reset-data --force
  dotnet run -- reset-data -c "Host=localhost;Port=5432;Database=mydb;Username=user;Password=pass" --force
  dotnet run -- db-info
```

---

## Workflow Examples

### Development: Reset Database Between Test Runs

```bash
# With confirmation prompt
dotnet run --project src/DataEntryGen.Tools -- reset-data

# Or with force flag (automated scripts)
dotnet run --project src/DataEntryGen.Tools -- reset-data --force
```

### Verify Database Connectivity

```bash
dotnet run --project src/DataEntryGen.Tools -- db-info
```

### Health Check Before Deployment

```bash
curl https://api.yourdomain.com/api/ping
```

### Reset via API (in application code)

```csharp
using var client = new HttpClient();
var response = await client.PostAsync("https://localhost:5001/api/admin/reset-data", null);
if (response.IsSuccessStatusCode)
{
    var json = await response.Content.ReadAsStringAsync();
    Console.WriteLine(json);
}
```

---

## Connection String Format

PostgreSQL connection strings follow this format:

```
Host=hostname;Port=port;Database=database_name;Username=username;Password=password
```

**Examples:**
```
# Local development (default Aspire)
Host=localhost;Port=5432;Database=dataentrygendb;Username=postgres;Password=postgres

# Custom host with authentication
Host=db.example.com;Port=5432;Database=production_db;Username=appuser;Password=SecurePassword123

# Docker container
Host=postgres;Port=5432;Database=dataentrygendb;Username=postgres;Password=postgres
```

---

## Integration with Aspire

When running via Aspire, the database connection is automatically configured:

```bash
cd src/DataEntryGen.AppHost
dotnet run
```

The Aspire host sets up:
- PostgreSQL container automatically
- Database connections for all services
- Service discovery

You can still use the Tools directly by specifying the connection string:

```bash
dotnet run --project src/DataEntryGen.Tools -- reset-data --force
```

---

## Common Scenarios

### Scenario 1: Automated Testing

In your CI/CD pipeline, reset data before running tests:

```bash
# Reset test database
dotnet run --project src/DataEntryGen.Tools -- reset-data --force

# Run tests
dotnet test
```

### Scenario 2: Development Environment Setup

Initialize clean database for development:

```bash
# Ensure database exists and is clean
dotnet run --project src/DataEntryGen.Tools -- db-info

# If needed, reset
dotnet run --project src/DataEntryGen.Tools -- reset-data --force

# Then seed test data (if you have a seed command)
dotnet run
```

### Scenario 3: Health Monitoring

Check API health in monitoring scripts:

```bash
#!/bin/bash
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://localhost:5001/api/ping)
if [ $RESPONSE -eq 200 ]; then
    echo "API is healthy"
else
    echo "API is unhealthy: $RESPONSE"
    exit 1
fi
```

---

## Troubleshooting

### Connection Refused

**Error:** `Cannot connect to database`

**Solution:**
1. Verify PostgreSQL is running
2. Check connection string is correct
3. Verify username/password
4. Ensure port 5432 is accessible

### Invalid Connection String

**Error:** `Invalid connection string format`

**Solution:**
Verify connection string matches format: `Host=...;Port=...;Database=...;Username=...;Password=...`

### Permission Denied

**Error:** `FATAL: authentication failed for user`

**Solution:**
1. Verify username and password are correct
2. Ensure user has appropriate permissions on the database
3. Check PostgreSQL pg_hba.conf if using custom authentication

### Database Does Not Exist

**Error:** `database "xyz" does not exist`

**Solution:**
1. Create the database manually: `createdb -U postgres dataentrygendb`
2. Or specify correct database name
3. Check spelling and case sensitivity

---

## Best Practices

1. **Always confirm before reset** - Don't use `--force` unless you're sure
2. **Backup important data** - Before resetting production databases
3. **Use environment-specific connections** - Don't hardcode production connection strings
4. **Log operations** - Keep track of who ran reset operations
5. **Protect admin endpoints** - Use authentication/authorization in production
6. **Monitor health checks** - Regularly verify API health
7. **Version control** - Don't commit connection strings to Git

---

## API Documentation

For interactive API documentation, visit:

```
https://localhost:5001/openapi/v1.json    # OpenAPI schema
```

Or access it through the Swagger UI (if configured):

```
https://localhost:5001/swagger            # Swagger UI
```

---

## Security Considerations

⚠️ **IMPORTANT:** The admin reset endpoint is extremely powerful and should be:

1. **Protected by authentication** - Require valid JWT or API key
2. **Protected by authorization** - Admin users only
3. **Logged for audit** - Track all reset operations
4. **Rate-limited** - Prevent accidental/malicious repeated calls
5. **Monitored** - Alert on suspicious usage

**Example production safeguards:**

```csharp
// In Program.cs
app.MapPost("/api/admin/reset-data", async (DataEntryDbContext db, HttpContext context) =>
{
    // Check authentication
    if (!context.User.Identity?.IsAuthenticated ?? false)
        return Results.Unauthorized();
    
    // Check authorization
    if (!context.User.IsInRole("Admin"))
        return Results.Forbid();
    
    // Check additional confirmation token
    if (!await ValidateResetToken(context))
        return Results.BadRequest("Invalid reset token");
    
    // Proceed with reset (with audit logging)
    await LogAdminAction(context.User.Identity?.Name, "Reset database");
    
    // ... perform reset ...
})
.RequireAuthorization("AdminOnly");
```

---

For more information, see:
- [README.md](README.md) - Project overview
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [QUICKSTART.md](QUICKSTART.md) - Getting started
