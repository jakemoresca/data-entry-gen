using DataEntryGen.Backend.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace DataEntryGen.Backend.Services
{
    /// <summary>
    /// Generic service for performing CRUD operations on any table without hardcoded models.
    /// </summary>
    public interface IGenericDataService
    {
        Task<List<Dictionary<string, object?>>> GetAllRecordsAsync(string tableName);
        Task<Dictionary<string, object?>?> GetRecordByPrimaryKeyAsync(string tableName, object primaryKeyValue);
        Task<bool> InsertRecordAsync(string tableName, Dictionary<string, object?> data);
        Task<bool> UpdateRecordAsync(string tableName, Dictionary<string, object?> data);
        Task<bool> DeleteRecordAsync(string tableName, object primaryKeyValue);
        Task<string?> GetPrimaryKeyColumnAsync(string tableName);
    }

    public class GenericDataService : IGenericDataService
    {
        private readonly DataEntryDbContext _context;
        private readonly ILogger<GenericDataService> _logger;

        public GenericDataService(DataEntryDbContext context, ILogger<GenericDataService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<Dictionary<string, object?>>> GetAllRecordsAsync(string tableName)
        {
            ValidateTableName(tableName);

            var query = $"SELECT * FROM \"{tableName}\"";
            var records = new List<Dictionary<string, object?>>();

            await _context.Database.OpenConnectionAsync();
            try
            {
                using (var command = _context.Database.GetDbConnection().CreateCommand())
                {
                    command.CommandText = query;
                    using (var result = await command.ExecuteReaderAsync())
                    {
                        var columns = Enumerable.Range(0, result.FieldCount)
                            .Select(result.GetName)
                            .ToList();

                        while (await result.ReadAsync())
                        {
                            var record = new Dictionary<string, object?>();
                            foreach (var column in columns)
                            {
                                var value = result[column];
                                record[column] = value == DBNull.Value ? null : value;
                            }
                            records.Add(record);
                        }
                    }
                }
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }

            return records;
        }

        public async Task<Dictionary<string, object?>?> GetRecordByPrimaryKeyAsync(string tableName, object primaryKeyValue)
        {
            ValidateTableName(tableName);

            var pkColumn = await GetPrimaryKeyColumnAsync(tableName);
            if (string.IsNullOrEmpty(pkColumn))
                return null;

            var query = $"SELECT * FROM \"{tableName}\" WHERE \"{pkColumn}\" = @pk LIMIT 1";

            await _context.Database.OpenConnectionAsync();
            try
            {
                using (var command = _context.Database.GetDbConnection().CreateCommand())
                {
                    command.CommandText = query;
                    var parameter = command.CreateParameter();
                    parameter.ParameterName = "@pk";
                    parameter.Value = primaryKeyValue ?? DBNull.Value;
                    command.Parameters.Add(parameter);

                    using (var result = await command.ExecuteReaderAsync())
                    {
                        if (await result.ReadAsync())
                        {
                            var record = new Dictionary<string, object?>();
                            for (int i = 0; i < result.FieldCount; i++)
                            {
                                var columnName = result.GetName(i);
                                var value = result.GetValue(i);
                                record[columnName] = value == DBNull.Value ? null : value;
                            }
                            return record;
                        }
                    }
                }
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }

            return null;
        }

        public async Task<bool> InsertRecordAsync(string tableName, Dictionary<string, object?> data)
        {
            ValidateTableName(tableName);

            if (data == null || data.Count == 0)
                return false;

            var columns = string.Join(", ", data.Keys.Select(k => $"\"{k}\""));
            var parameters = string.Join(", ", data.Keys.Select((k, i) => $"@p{i}"));
            var query = $"INSERT INTO \"{tableName}\" ({columns}) VALUES ({parameters})";

            await _context.Database.OpenConnectionAsync();
            try
            {
                using (var command = _context.Database.GetDbConnection().CreateCommand())
                {
                    command.CommandText = query;

                    int paramIndex = 0;
                    foreach (var kvp in data)
                    {
                        var parameter = command.CreateParameter();
                        parameter.ParameterName = $"@p{paramIndex}";
                        parameter.Value = NormalizeValue(kvp.Value, kvp.Key) ?? DBNull.Value;
                        command.Parameters.Add(parameter);
                        paramIndex++;
                    }

                    var result = await command.ExecuteNonQueryAsync();
                    return result > 0;
                }
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }
        }

        public async Task<bool> UpdateRecordAsync(string tableName, Dictionary<string, object?> data)
        {
            ValidateTableName(tableName);

            if (data == null || data.Count == 0)
                return false;

            var pkColumn = await GetPrimaryKeyColumnAsync(tableName);
            if (string.IsNullOrEmpty(pkColumn) || !data.ContainsKey(pkColumn))
                return false;

            var pkValue = data[pkColumn];
            var updateColumns = data.Keys.Where(k => k != pkColumn);

            if (!updateColumns.Any())
                return false;

            var setClause = string.Join(", ", updateColumns.Select((col, i) => $"\"{col}\" = @p{i}"));
            var query = $"UPDATE \"{tableName}\" SET {setClause} WHERE \"{pkColumn}\" = @pk";

            await _context.Database.OpenConnectionAsync();
            try
            {
                using (var command = _context.Database.GetDbConnection().CreateCommand())
                {
                    command.CommandText = query;

                    // Log the query and parameters for diagnostics
                    try
                    {
                        _logger.LogDebug("Executing Update: {Query}", query);
                    }
                    catch { }

                    int paramIndex = 0;
                    foreach (var col in updateColumns)
                    {
                        var parameter = command.CreateParameter();
                        parameter.ParameterName = $"@p{paramIndex}";
                        parameter.Value = NormalizeValue(data[col], col) ?? DBNull.Value;
                        command.Parameters.Add(parameter);
                        paramIndex++;
                    }

                    var pkParam = command.CreateParameter();
                    pkParam.ParameterName = "@pk";
                    pkParam.Value = NormalizeValue(pkValue, pkColumn) ?? DBNull.Value;
                    command.Parameters.Add(pkParam);

                    var result = await command.ExecuteNonQueryAsync();
                    try { _logger.LogDebug("Update affected {Count} rows", result); } catch { }
                    return result > 0;
                }
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }
        }

        public async Task<bool> DeleteRecordAsync(string tableName, object primaryKeyValue)
        {
            ValidateTableName(tableName);

            var pkColumn = await GetPrimaryKeyColumnAsync(tableName);
            if (string.IsNullOrEmpty(pkColumn))
                return false;

            var query = $"DELETE FROM \"{tableName}\" WHERE \"{pkColumn}\" = @pk";

            await _context.Database.OpenConnectionAsync();
            try
            {
                using (var command = _context.Database.GetDbConnection().CreateCommand())
                {
                    command.CommandText = query;
                    var parameter = command.CreateParameter();
                    parameter.ParameterName = "@pk";
                    parameter.Value = NormalizeValue(primaryKeyValue, pkColumn) ?? DBNull.Value;
                    command.Parameters.Add(parameter);

                    var result = await command.ExecuteNonQueryAsync();
                    return result > 0;
                }
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }
        }

        public async Task<string?> GetPrimaryKeyColumnAsync(string tableName)
        {
            ValidateTableName(tableName);
            var query = @"
                SELECT kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY'
                  AND tc.table_name = @tableName
                  AND tc.table_schema = 'public'
                LIMIT 1";

            await _context.Database.OpenConnectionAsync();
            try
            {
                using (var command = _context.Database.GetDbConnection().CreateCommand())
                {
                    command.CommandText = query;
                    var param = command.CreateParameter();
                    param.ParameterName = "@tableName";
                    param.Value = tableName;
                    command.Parameters.Add(param);

                    using (var reader = await command.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            var val = reader.GetValue(0);
                            return val == DBNull.Value ? null : val?.ToString();
                        }
                    }
                }
                return null;
            }
            catch (Exception ex)
            {
                try { _logger.LogWarning(ex, "GetPrimaryKeyColumnAsync failed for {Table}", tableName); } catch { }
                return null;
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }
        }

        private static void ValidateTableName(string tableName)
        {
            // Basic SQL injection prevention - table names should be alphanumeric with underscores
            if (string.IsNullOrWhiteSpace(tableName) || 
                !System.Text.RegularExpressions.Regex.IsMatch(tableName, @"^[a-zA-Z_][a-zA-Z0-9_]*$"))
            {
                throw new ArgumentException("Invalid table name");
            }
        }

        private static object? NormalizeValue(object? value, string? columnName = null)
        {
            if (value == null)
                return null;

            // Unwrap JsonElement values from System.Text.Json binding
            if (value is JsonElement je)
            {
                switch (je.ValueKind)
                {
                        case JsonValueKind.String:
                            var s = je.GetString();
                            if (!string.IsNullOrEmpty(s))
                            {
                                if (Guid.TryParse(s, out var g))
                                {
                                    return g;
                                }
                            }
                            return s;
                    case JsonValueKind.Number:
                        if (je.TryGetInt64(out var l)) return l;
                        if (je.TryGetDouble(out var d)) return d;
                        return je.GetDecimal();
                    case JsonValueKind.True:
                    case JsonValueKind.False:
                        return je.GetBoolean();
                    case JsonValueKind.Null:
                        return null;
                    default:
                        // Object or Array: pass raw JSON text so it maps to json/jsonb when used explicitly
                        return je.GetRawText();
                }
            }

            // If caller passed a string that looks like a UUID, attempt to parse Guid
            if (value is string vs)
            {
                if (Guid.TryParse(vs, out var g)) return g;

                // If it's specifically the primary id column attempt parsing as well
                if (!string.IsNullOrEmpty(columnName) && string.Equals(columnName, "id", StringComparison.OrdinalIgnoreCase))
                {
                    if (Guid.TryParse(vs, out var g2)) return g2;
                }
            }

            return value;
        }
    }
}
