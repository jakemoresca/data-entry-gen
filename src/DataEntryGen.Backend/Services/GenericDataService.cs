using DataEntryGen.Backend.Data;
using Microsoft.EntityFrameworkCore;

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

        public GenericDataService(DataEntryDbContext context)
        {
            _context = context;
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
                        parameter.Value = kvp.Value ?? DBNull.Value;
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

                    int paramIndex = 0;
                    foreach (var col in updateColumns)
                    {
                        var parameter = command.CreateParameter();
                        parameter.ParameterName = $"@p{paramIndex}";
                        parameter.Value = data[col] ?? DBNull.Value;
                        command.Parameters.Add(parameter);
                        paramIndex++;
                    }

                    var pkParam = command.CreateParameter();
                    pkParam.ParameterName = "@pk";
                    pkParam.Value = pkValue ?? DBNull.Value;
                    command.Parameters.Add(pkParam);

                    var result = await command.ExecuteNonQueryAsync();
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
                    parameter.Value = primaryKeyValue ?? DBNull.Value;
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

            var query = @$"
                SELECT a.attname
                FROM pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid
                    AND a.attnum = ANY(i.indkey)
                WHERE i.indrelname = '{tableName}'
                AND i.indisprimary
                LIMIT 1";

            try
            {
                var pkColumn = await _context.Database.SqlQueryRaw<string>(query).FirstOrDefaultAsync();
                return pkColumn;
            }
            catch
            {
                return null;
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
    }
}
