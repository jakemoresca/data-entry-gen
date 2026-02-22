using DataEntryGen.Backend.Data;
using DataEntryGen.Backend.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add Entity Framework Core with Aspire PostgreSQL
builder.AddNpgsqlDbContext<DataEntryDbContext>("dataentrygendb");

// Register generic services
builder.Services.AddScoped<ISchemaDiscoveryService, SchemaDiscoveryService>();
builder.Services.AddScoped<IGenericDataService, GenericDataService>();

// Add services to the container.
builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowBlazorFrontend", policy =>
    {
        policy.WithOrigins("https://localhost:5002")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("AllowBlazorFrontend");

// Health Check / Ping endpoint
app.MapGet("/api/ping", () => 
{
    return Results.Ok("pong");
})
.WithName("Ping")
.WithOpenApi();

// Schema Discovery endpoints
app.MapGet("/api/schema/tables", async (ISchemaDiscoveryService schemaService) =>
{
    var tables = await schemaService.DiscoverTablesAsync();
    return Results.Ok(tables);
})
.WithName("GetAllTables")
.WithOpenApi()
.WithDescription("Discover all tables in the database");

app.MapGet("/api/schema/tables/{tableName}", async (string tableName, ISchemaDiscoveryService schemaService) =>
{
    var schema = await schemaService.GetTableSchemaAsync(tableName);
    return schema == null ? Results.NotFound($"Table '{tableName}' not found") : Results.Ok(schema);
})
.WithName("GetTableSchema")
.WithOpenApi()
.WithDescription("Get schema information for a specific table");

// Generic CRUD endpoints
app.MapGet("/api/data/{tableName}", async (string tableName, IGenericDataService dataService) =>
{
    try
    {
        var records = await dataService.GetAllRecordsAsync(tableName);
        return Results.Ok(records);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.WithName("GetAllRecords")
.WithOpenApi()
.WithDescription("Get all records from a specific table");

app.MapGet("/api/data/{tableName}/{id}", async (string tableName, string id, IGenericDataService dataService) =>
{
    try
    {
        var record = await dataService.GetRecordByPrimaryKeyAsync(tableName, id);
        return record == null ? Results.NotFound() : Results.Ok(record);
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.WithName("GetRecordById")
.WithOpenApi()
.WithDescription("Get a specific record by primary key");

app.MapPost("/api/data/{tableName}", async (string tableName, Dictionary<string, object?> data, IGenericDataService dataService) =>
{
    try
    {
        var success = await dataService.InsertRecordAsync(tableName, data);
        return success 
            ? Results.Created($"/api/data/{tableName}", new { message = "Record created" })
            : Results.BadRequest(new { error = "Failed to insert record" });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.WithName("InsertRecord")
.WithOpenApi()
.WithDescription("Insert a new record into a table");

app.MapPut("/api/data/{tableName}", async (string tableName, Dictionary<string, object?> data, IGenericDataService dataService) =>
{
    try
    {
        var success = await dataService.UpdateRecordAsync(tableName, data);
        return success
            ? Results.Ok(new { message = "Record updated" })
            : Results.BadRequest(new { error = "Failed to update record" });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.WithName("UpdateRecord")
.WithOpenApi()
.WithDescription("Update an existing record in a table");

app.MapDelete("/api/data/{tableName}/{id}", async (string tableName, string id, IGenericDataService dataService) =>
{
    try
    {
        var success = await dataService.DeleteRecordAsync(tableName, id);
        return success
            ? Results.Ok(new { message = "Record deleted" })
            : Results.NotFound(new { error = "Record not found" });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.WithName("DeleteRecord")
.WithOpenApi()
.WithDescription("Delete a record from a table");

// Admin endpoint to clear all data (for development/testing)
app.MapPost("/api/admin/reset-data", async (DataEntryDbContext db) =>
{
    try
    {
        // Delete all data from all tables
        // In production, this should be protected by authentication/authorization
        
        // Get all entity types
        var entityTypes = db.Model.GetEntityTypes();
        
        foreach (var entityType in entityTypes)
        {
            var tableName = entityType.GetTableName();
            if (!string.IsNullOrEmpty(tableName))
            {
                await db.Database.ExecuteSqlRawAsync($"TRUNCATE TABLE \"{tableName}\" CASCADE");
            }
        }
        
        return Results.Ok(new { message = "All data deleted successfully" });
    }
    catch (Exception ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.WithName("ResetAllData")
.WithOpenApi();

// Sample endpoint for reference
var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
