using DataEntryGen.Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace DataEntryGen.Backend.Services
{
    /// <summary>
    /// Represents a column in a database table.
    /// </summary>
    public class ColumnInfo
    {
        public required string Name { get; set; }
        public required string DataType { get; set; }
        public bool IsNullable { get; set; }
        public bool IsPrimaryKey { get; set; }
        public bool IsForeignKey { get; set; }
        public string? ForeignKeyTable { get; set; }
        public string? ForeignKeyColumn { get; set; }
    }

    /// <summary>
    /// Represents a table in the database.
    /// </summary>
    public class TableInfo
    {
        public required string Name { get; set; }
        public List<ColumnInfo> Columns { get; set; } = new();
    }

    /// <summary>
    /// Service for discovering database schema dynamically.
    /// </summary>
    public interface ISchemaDiscoveryService
    {
        Task<List<TableInfo>> DiscoverTablesAsync();
        Task<TableInfo?> GetTableSchemaAsync(string tableName);
    }

    public class SchemaDiscoveryService : ISchemaDiscoveryService
    {
        private readonly DataEntryDbContext _context;
        private readonly ILogger<SchemaDiscoveryService> _logger;

        public SchemaDiscoveryService(DataEntryDbContext context, ILogger<SchemaDiscoveryService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<TableInfo>> DiscoverTablesAsync()
        {
            var tables = new List<TableInfo>();

            // Get all tables from PostgreSQL
            var tableQuery = @"
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name";

            var tableNames = await _context.Database.SqlQueryRaw<string>(tableQuery).ToListAsync();
            _logger.LogDebug("Discovered tables: {Tables}", string.Join(',', tableNames));

            foreach (var tableName in tableNames)
            {
                var schema = await GetTableSchemaAsync(tableName);
                if (schema != null)
                {
                    tables.Add(schema);
                }
            }

            return tables;
        }

        public async Task<TableInfo?> GetTableSchemaAsync(string tableName)
        {
            try
            {
                var columnQuery = @$"
                                        SELECT 
                                            c.column_name::text as Name,
                                            c.data_type::text as DataType,
                                                (c.is_nullable = 'YES') as IsNullable,
                                                EXISTS(
                                                        SELECT 1 FROM information_schema.table_constraints tc
                                                        JOIN information_schema.key_column_usage kcu
                                                            ON kcu.constraint_name = tc.constraint_name
                                                        WHERE tc.table_name = '{tableName}'
                                                            AND tc.constraint_type = 'PRIMARY KEY'
                                                            AND tc.table_schema = 'public'
                                                            AND kcu.column_name = c.column_name
                                                ) as IsPrimaryKey
                                        FROM information_schema.columns c
                                        WHERE c.table_name = '{tableName}'
                                            AND c.table_schema = 'public'
                                        ORDER BY c.ordinal_position";

                // Use a concrete DTO for mapping results to avoid tuple mapping issues
                var columns = await _context.Database
                    .SqlQueryRaw<ColumnRow>(columnQuery)
                    .ToListAsync();

                var columnInfos = new List<ColumnInfo>();
                foreach (var col in columns)
                {
                    columnInfos.Add(new ColumnInfo
                    {
                        Name = col.Name,
                        DataType = col.DataType,
                        IsNullable = col.IsNullable,
                        IsPrimaryKey = col.IsPrimaryKey
                    });
                }

                return new TableInfo
                {
                    Name = tableName,
                    Columns = columnInfos
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to get schema for table {TableName}", tableName);
                return null;
            }
        }

        private class ColumnRow
        {
            public string Name { get; set; } = string.Empty;
            public string DataType { get; set; } = string.Empty;
            public bool IsNullable { get; set; }
            public bool IsPrimaryKey { get; set; }
        }
    }
}
