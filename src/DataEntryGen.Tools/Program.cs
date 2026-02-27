using DataEntryGen.Backend.Data;
using Microsoft.EntityFrameworkCore;

Console.WriteLine("🗑️  Data Entry Gen - Database Management Tool");
Console.WriteLine("=".PadRight(50, '='));

if (args.Length == 0)
{
    ShowHelp();
    return;
}

string command = args[0].ToLower();
string connectionString = "Host=localhost;Port=5432;Database=dataentrygendb;Username=postgres;Password=postgres";

// Check for connection string argument
if (args.Length > 1 && (args[args.Length - 2] == "-c" || args[args.Length - 2] == "--connection"))
{
    connectionString = args[args.Length - 1];
}

bool force = args.Contains("-f") || args.Contains("--force");

try
{
    switch (command)
    {
        case "reset-data":
        case "reset":
            await ResetData(connectionString, force);
            break;

        case "db-info":
        case "info":
            await DatabaseInfo(connectionString);
            break;

            case "create-test-table":
            case "create-test":
                await CreateTestTable(connectionString, force);
                break;

        case "help":
        case "-h":
        case "--help":
            ShowHelp();
            break;

        default:
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"Unknown command: {command}");
            Console.ResetColor();
            ShowHelp();
            Environment.Exit(1);
            break;
    }
}
catch (Exception ex)
{
    Console.ForegroundColor = ConsoleColor.Red;
    Console.WriteLine($"\n❌ Error: {ex.Message}");
    Console.ResetColor();
    Environment.Exit(1);
}

async Task ResetData(string connString, bool skipConfirmation)
{
    Console.WriteLine("\n🗑️  Deleting all database data...");
    
    if (!skipConfirmation)
    {
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine("⚠️  WARNING: This will delete ALL data from the database!");
        Console.ResetColor();
        Console.Write("\nAre you sure? Type 'yes' to confirm: ");
        var response = Console.ReadLine();
        
        if (response?.ToLower() != "yes")
        {
            Console.WriteLine("❌ Operation cancelled.");
            return;
        }
    }

    var options = new DbContextOptionsBuilder<DataEntryDbContext>()
        .UseNpgsql(connString)
        .Options;

    using (var context = new DataEntryDbContext(options))
    {
        Console.WriteLine("⏳ Connecting to database...");
        
        if (!await context.Database.CanConnectAsync())
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("❌ Cannot connect to database.");
            Console.ResetColor();
            Environment.Exit(1);
        }

        Console.WriteLine("✅ Connected successfully.");
        Console.WriteLine("⏳ Deleting all data...\n");

        var entityTypes = context.Model.GetEntityTypes().ToList();
        int tableCount = 0;

        foreach (var entityType in entityTypes)
        {
            var tableName = entityType.GetTableName();
            if (!string.IsNullOrEmpty(tableName))
            {
                Console.WriteLine($"  - Truncating: {tableName}");
                await context.Database.ExecuteSqlRawAsync($"TRUNCATE TABLE \"{tableName}\" CASCADE");
                tableCount++;
            }
        }

        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"\n✅ Successfully deleted all data from {tableCount} table(s).");
        Console.ResetColor();
    }
}

async Task DatabaseInfo(string connString)
{
    Console.WriteLine("\n📊 Gathering database information...");

    var options = new DbContextOptionsBuilder<DataEntryDbContext>()
        .UseNpgsql(connString)
        .Options;

    using (var context = new DataEntryDbContext(options))
    {
        Console.WriteLine("⏳ Connecting to database...");
        
        if (!await context.Database.CanConnectAsync())
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("❌ Cannot connect to database.");
            Console.ResetColor();
            return;
        }

        Console.WriteLine("✅ Connected successfully.\n");

        var entityTypes = context.Model.GetEntityTypes().ToList();
        
        Console.WriteLine($"📋 Entity Types: {entityTypes.Count}");
        if (entityTypes.Count > 0)
        {
            foreach (var entityType in entityTypes)
            {
                var tableName = entityType.GetTableName();
                Console.WriteLine($"   • {entityType.Name} → {tableName}");
            }
        }
        else
        {
            Console.WriteLine("   (No entities configured yet)");
        }

        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("\n✅ Database is ready.");
        Console.ResetColor();
    }
}

async Task CreateTestTable(string connString, bool skipConfirmation)
{
    Console.WriteLine("\n🛠️  Creating test table 'departments' and inserting sample records...");

    if (!skipConfirmation)
    {
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine("⚠️  This will create the 'departments' table if it does not exist and insert sample rows.");
        Console.ResetColor();
        Console.Write("Proceed? Type 'yes' to confirm: ");
        var response = Console.ReadLine();
        if (response?.ToLower() != "yes")
        {
            Console.WriteLine("❌ Operation cancelled.");
            return;
        }
    }

    var options = new DbContextOptionsBuilder<DataEntryDbContext>()
        .UseNpgsql(connString)
        .Options;

    using (var context = new DataEntryDbContext(options))
    {
        Console.WriteLine("⏳ Connecting to database...");
        if (!await context.Database.CanConnectAsync())
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("❌ Cannot connect to database.");
            Console.ResetColor();
            Environment.Exit(1);
        }

        Console.WriteLine("✅ Connected successfully.");

        // Create table if not exists. id is uuid NOT NULL with no default (caller provides it).
        var createTableSql = @"CREATE TABLE IF NOT EXISTS public.departments (
            id uuid NOT NULL,
            name text,
            description text,
            PRIMARY KEY (id)
        );";

        await context.Database.ExecuteSqlRawAsync(createTableSql);

        // Insert two sample rows with explicit UUIDs; use parameterized/interpolated execution to avoid SQL injection
        var id1 = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var id2 = Guid.Parse("22222222-2222-2222-2222-222222222222");

        var name1 = "Backend";
        var desc1 = "Test backend department description";

        var name2 = "Frontend";
        var desc2 = "Test frontend department description";

        await context.Database.ExecuteSqlInterpolatedAsync($@"INSERT INTO public.departments (id, name, description)
            VALUES ({id1}, {name1}, {desc1})
            ON CONFLICT (id) DO NOTHING;");

        await context.Database.ExecuteSqlInterpolatedAsync($@"INSERT INTO public.departments (id, name, description)
            VALUES ({id2}, {name2}, {desc2})
            ON CONFLICT (id) DO NOTHING;");

        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("\n✅ 'departments' table created (if missing) and sample records inserted.");
        Console.ResetColor();
    }
}

void ShowHelp()
{
    Console.WriteLine("\nUsage: dotnet run -- [command] [options]");
    Console.WriteLine("\nAvailable Commands:");
    Console.WriteLine("  reset-data, reset    Delete all database data");
    Console.WriteLine("  db-info, info        Show database entity information");
    Console.WriteLine("  create-test-table, create-test  Create 'departments' test table and insert sample rows");
    Console.WriteLine("  help, -h, --help     Show this help message");
    Console.WriteLine("\nOptions:");
    Console.WriteLine("  -c, --connection     PostgreSQL connection string");
    Console.WriteLine("  -f, --force          Skip confirmation prompt");
    Console.WriteLine("\nExamples:");
    Console.WriteLine("  dotnet run -- reset-data");
    Console.WriteLine("  dotnet run -- reset-data --force");
    Console.WriteLine("  dotnet run -- reset-data -c \"Host=localhost;Port=5432;Database=mydb;Username=user;Password=pass\" --force");
    Console.WriteLine("  dotnet run -- db-info");
    Console.WriteLine("  dotnet run -- create-test-table");
}
