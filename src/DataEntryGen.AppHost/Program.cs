using Aspire.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

// Add PostgreSQL database for testing
var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin();

var db = postgres.AddDatabase("dataentrygendb");

// Add Backend API project
var backendProject = builder.AddProject("backend", "../DataEntryGen.Backend/DataEntryGen.Backend.csproj")
    .WithReference(db)
    .WithHttpsEndpoint(port: 5001, name: "https");

// Add Frontend Blazor WASM project
var frontendProject = builder.AddProject("frontend", "../DataEntryGen.Frontend/DataEntryGen.Frontend.csproj")
    .WithHttpsEndpoint(port: 5002, name: "https");

builder.Build().Run();
