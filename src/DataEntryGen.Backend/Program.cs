using DataEntryGen.Backend.Data;
using DataEntryGen.Backend.Services;
using DataEntryGen.Backend.Services.Registration;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Add Entity Framework Core with Aspire PostgreSQL
builder.AddNpgsqlDbContext<DataEntryDbContext>("dataentrygendb");

// Register generic services
builder.Services.AddScoped<ISchemaDiscoveryService, SchemaDiscoveryService>();
builder.Services.AddScoped<IGenericDataService, GenericDataService>();
builder.Services.AddScoped<IRegistrationRepository, RegistrationRepository>();
builder.Services.AddScoped<RegistrationInitializer>();

// Add controllers and OpenAPI
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowBlazorFrontend", policy =>
    {
        policy.WithOrigins(
                "https://localhost:5002",
                "http://localhost:5002",
                "https://localhost:7107",
                "http://localhost:5160")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();
app.UseCors("AllowBlazorFrontend");

app.MapControllers();

app.Run();
