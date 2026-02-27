using DataEntryGen.Backend.Data;
using Microsoft.EntityFrameworkCore;
using System.Data.Common;
using System.Text.Json;

namespace DataEntryGen.Backend.Services.Registration
{
    public class RegistrationRepository : IRegistrationRepository
    {
        private const string QualifiedTable = "\"data-entry\".\"registration\"";
        private readonly DataEntryDbContext _context;
        private readonly ILogger<RegistrationRepository> _logger;

        public RegistrationRepository(DataEntryDbContext context, ILogger<RegistrationRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task InitializeAsync()
        {
            var createSchema = "CREATE SCHEMA IF NOT EXISTS \"data-entry\";";
            var createTable = $@"
                CREATE TABLE IF NOT EXISTS {QualifiedTable} (
                    id uuid PRIMARY KEY,
                    table_name text NOT NULL,
                    description text,
                    id_column_name text,
                    settings jsonb,
                    default_data jsonb
                );";

            await _context.Database.OpenConnectionAsync();
            try
            {
                using var cmd = _context.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = createSchema + createTable;
                await cmd.ExecuteNonQueryAsync();
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }
        }

        public async Task<RegistrationRecord> CreateAsync(RegistrationRecord record)
        {
            if (record.Id == Guid.Empty)
                record.Id = Guid.NewGuid();

            var query = $"INSERT INTO {QualifiedTable} (id, table_name, description, id_column_name, settings, default_data) VALUES (@id, @table_name, @description, @id_column_name, @settings::jsonb, @default_data::jsonb)";

            await _context.Database.OpenConnectionAsync();
            try
            {
                using var cmd = _context.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = query;
                AddParameter(cmd, "@id", record.Id);
                AddParameter(cmd, "@table_name", record.TableName);
                AddParameter(cmd, "@description", record.Description);
                AddParameter(cmd, "@id_column_name", record.IdColumnName);
                AddParameter(cmd, "@settings", ToJsonString(record.Settings));
                AddParameter(cmd, "@default_data", ToJsonString(record.DefaultData));

                await cmd.ExecuteNonQueryAsync();
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }

            return record;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var query = $"DELETE FROM {QualifiedTable} WHERE id = @id";
            await _context.Database.OpenConnectionAsync();
            try
            {
                using var cmd = _context.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = query;
                AddParameter(cmd, "@id", id);
                var result = await cmd.ExecuteNonQueryAsync();
                return result > 0;
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }
        }

        public async Task<List<RegistrationRecord>> GetAllAsync()
        {
            var list = new List<RegistrationRecord>();
            var query = $"SELECT id, table_name, description, id_column_name, settings, default_data FROM {QualifiedTable}";

            await _context.Database.OpenConnectionAsync();
            try
            {
                using var cmd = _context.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = query;
                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    list.Add(MapRecord(reader));
                }
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }

            return list;
        }

        public async Task<RegistrationRecord?> GetByIdAsync(Guid id)
        {
            var query = $"SELECT id, table_name, description, id_column_name, settings, default_data FROM {QualifiedTable} WHERE id = @id LIMIT 1";

            await _context.Database.OpenConnectionAsync();
            try
            {
                using var cmd = _context.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = query;
                AddParameter(cmd, "@id", id);
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                    return MapRecord(reader);
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }

            return null;
        }

        public async Task<bool> UpdateAsync(RegistrationRecord record)
        {
            var query = $"UPDATE {QualifiedTable} SET table_name = @table_name, description = @description, id_column_name = @id_column_name, settings = @settings::jsonb, default_data = @default_data::jsonb WHERE id = @id";

            await _context.Database.OpenConnectionAsync();
            try
            {
                using var cmd = _context.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = query;
                AddParameter(cmd, "@table_name", record.TableName);
                AddParameter(cmd, "@description", record.Description);
                AddParameter(cmd, "@id_column_name", record.IdColumnName);
                AddParameter(cmd, "@settings", ToJsonString(record.Settings));
                AddParameter(cmd, "@default_data", ToJsonString(record.DefaultData));
                AddParameter(cmd, "@id", record.Id);

                var result = await cmd.ExecuteNonQueryAsync();
                return result > 0;
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }
        }

        public async Task<bool> AddIfNotExistsAsync(RegistrationRecord record)
        {
            // Check by table_name
            var existsQuery = $"SELECT id FROM {QualifiedTable} WHERE table_name = @table_name LIMIT 1";

            await _context.Database.OpenConnectionAsync();
            try
            {
                using var cmd = _context.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = existsQuery;
                AddParameter(cmd, "@table_name", record.TableName);
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                    return false;
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }

            await CreateAsync(record);
            return true;
        }

        private static void AddParameter(DbCommand cmd, string name, object? value)
        {
            var p = cmd.CreateParameter();
            p.ParameterName = name;
            p.Value = value ?? DBNull.Value;
            cmd.Parameters.Add(p);
        }

        private static string? ToJsonString(JsonElement? elem)
        {
            if (elem == null)
                return null;
            try
            {
                return elem.Value.GetRawText();
            }
            catch
            {
                return null;
            }
        }

        private static RegistrationRecord MapRecord(DbDataReader reader)
        {
            var rec = new RegistrationRecord { TableName = string.Empty };
            rec.Id = reader.GetFieldValue<Guid>(0);
            rec.TableName = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);
            rec.Description = reader.IsDBNull(2) ? null : reader.GetString(2);
            rec.IdColumnName = reader.IsDBNull(3) ? null : reader.GetString(3);

            if (!reader.IsDBNull(4))
            {
                var settingsJson = reader.GetValue(4).ToString();
                if (!string.IsNullOrEmpty(settingsJson))
                {
                    try
                    {
                        rec.Settings = JsonDocument.Parse(settingsJson).RootElement.Clone();
                    }
                    catch { rec.Settings = null; }
                }
            }

            if (!reader.IsDBNull(5))
            {
                var defaultJson = reader.GetValue(5).ToString();
                if (!string.IsNullOrEmpty(defaultJson))
                {
                    try
                    {
                        rec.DefaultData = JsonDocument.Parse(defaultJson).RootElement.Clone();
                    }
                    catch { rec.DefaultData = null; }
                }
            }

            return rec;
        }
    }
}
