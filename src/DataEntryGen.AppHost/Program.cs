using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Npgsql;
using System.IO;
using System.Reflection;

var builder = DistributedApplication.CreateBuilder(args);

// Add PostgreSQL database for testing

var postgres = builder.AddPostgres("postgres")
    .WithPgAdmin();

var db = postgres.AddDatabase("dataentrygendb");


db.WithCommand("test-data", "Test Data", async (ctx) =>
{
    var ct = ctx.CancellationToken;
    var connString = await db.Resource.ConnectionStringExpression.GetValueAsync(ct).ConfigureAwait(false);

    using var conn = new NpgsqlConnection(connString);
    await conn.OpenAsync();

    var initFile = Path.Combine(builder.AppHostDirectory, "init", "seed_departments.sql");
    var sql = File.ReadAllText(initFile);
    using var cmd = new NpgsqlCommand(sql, conn);
    cmd.ExecuteNonQuery();

    return CommandResults.Success();
});

// Add Backend API project
var backendProject = builder.AddProject<Projects.DataEntryGen_Backend>("backend")
    .WithReference(db)
    .WithHttpsEndpoint(port: 5001, name: "https");

// Add Frontend Blazor WASM project
// var frontendProject = builder.AddProject<Projects.DataEntryGen_Frontend>("frontend")
//     .WithHttpsEndpoint(port: 5002, name: "https");

var frontEndDirectory = Path.Combine(builder.AppHostDirectory, "..", "client");
var frontendApp = builder.AddViteApp("frontend-app", frontEndDirectory)
    .WithReference(backendProject);

builder.Build().Run();
