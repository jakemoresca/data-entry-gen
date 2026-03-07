using DataEntryGen.Backend.Data;
using Microsoft.EntityFrameworkCore;
using System.Data.Common;
using System.Text.Json;

namespace DataEntryGen.Backend.Services.Layouts
{
    public class LayoutRepository : ILayoutRepository
    {
        private const string QualifiedTable = "\"data-entry\".\"layouts\"";
        private readonly DataEntryDbContext _context;

        public LayoutRepository(DataEntryDbContext context)
        {
            _context = context;
        }

        public async Task InitializeAsync()
        {
            var createSchema = "CREATE SCHEMA IF NOT EXISTS \"data-entry\";";
            var createTable = $@"
                CREATE TABLE IF NOT EXISTS {QualifiedTable} (
                    id uuid PRIMARY KEY,
                    name text NOT NULL,
                    type text NOT NULL,
                    registration_id uuid NOT NULL,
                    layout jsonb,
                    CONSTRAINT ck_layouts_type CHECK (type IN ('list', 'detail'))
                );
                CREATE INDEX IF NOT EXISTS idx_layouts_registration_id ON {QualifiedTable} (registration_id);";

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

        public async Task<List<LayoutRecord>> GetAllAsync()
        {
            var list = new List<LayoutRecord>();
            var query = $"SELECT id, name, type, registration_id, layout FROM {QualifiedTable} ORDER BY name";

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

        public async Task<List<LayoutRecord>> GetByRegistrationIdAsync(Guid registrationId)
        {
            var list = new List<LayoutRecord>();
            var query = $"SELECT id, name, type, registration_id, layout FROM {QualifiedTable} WHERE registration_id = @registration_id ORDER BY name";

            await _context.Database.OpenConnectionAsync();
            try
            {
                using var cmd = _context.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = query;
                AddParameter(cmd, "@registration_id", registrationId);
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

        public async Task<LayoutRecord?> GetByIdAsync(Guid id)
        {
            var query = $"SELECT id, name, type, registration_id, layout FROM {QualifiedTable} WHERE id = @id LIMIT 1";

            await _context.Database.OpenConnectionAsync();
            try
            {
                using var cmd = _context.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = query;
                AddParameter(cmd, "@id", id);
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    return MapRecord(reader);
                }
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }

            return null;
        }

        public async Task<LayoutRecord> CreateAsync(LayoutRecord record)
        {
            if (record.Id == Guid.Empty)
            {
                record.Id = Guid.NewGuid();
            }

            record.Type = LayoutTypes.Normalize(record.Type);

            var query = $"INSERT INTO {QualifiedTable} (id, name, type, registration_id, layout) VALUES (@id, @name, @type, @registration_id, @layout::jsonb)";

            await _context.Database.OpenConnectionAsync();
            try
            {
                using var cmd = _context.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = query;
                AddParameter(cmd, "@id", record.Id);
                AddParameter(cmd, "@name", record.Name);
                AddParameter(cmd, "@type", record.Type);
                AddParameter(cmd, "@registration_id", record.RegistrationId);
                AddParameter(cmd, "@layout", ToJsonString(record.Layout));

                await cmd.ExecuteNonQueryAsync();
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }

            return record;
        }

        public async Task<bool> UpdateAsync(LayoutRecord record)
        {
            record.Type = LayoutTypes.Normalize(record.Type);
            var query = $"UPDATE {QualifiedTable} SET name = @name, type = @type, registration_id = @registration_id, layout = @layout::jsonb WHERE id = @id";

            await _context.Database.OpenConnectionAsync();
            try
            {
                using var cmd = _context.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = query;
                AddParameter(cmd, "@name", record.Name);
                AddParameter(cmd, "@type", record.Type);
                AddParameter(cmd, "@registration_id", record.RegistrationId);
                AddParameter(cmd, "@layout", ToJsonString(record.Layout));
                AddParameter(cmd, "@id", record.Id);
                var result = await cmd.ExecuteNonQueryAsync();
                return result > 0;
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }
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

        public async Task<int> DeleteByRegistrationIdAsync(Guid registrationId)
        {
            var query = $"DELETE FROM {QualifiedTable} WHERE registration_id = @registration_id";

            await _context.Database.OpenConnectionAsync();
            try
            {
                using var cmd = _context.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = query;
                AddParameter(cmd, "@registration_id", registrationId);
                return await cmd.ExecuteNonQueryAsync();
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }
        }

        public async Task<bool> AddIfNameNotExistsAsync(LayoutRecord record)
        {
            var existsQuery = $"SELECT id FROM {QualifiedTable} WHERE registration_id = @registration_id AND name = @name LIMIT 1";

            await _context.Database.OpenConnectionAsync();
            try
            {
                using var cmd = _context.Database.GetDbConnection().CreateCommand();
                cmd.CommandText = existsQuery;
                AddParameter(cmd, "@registration_id", record.RegistrationId);
                AddParameter(cmd, "@name", record.Name);
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    return false;
                }
            }
            finally
            {
                await _context.Database.CloseConnectionAsync();
            }

            await CreateAsync(record);
            return true;
        }

        private static LayoutRecord MapRecord(DbDataReader reader)
        {
            var rec = new LayoutRecord
            {
                Name = string.Empty,
                Type = LayoutTypes.List
            };

            rec.Id = reader.GetFieldValue<Guid>(0);
            rec.Name = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);
            rec.Type = reader.IsDBNull(2) ? LayoutTypes.List : reader.GetString(2);
            rec.RegistrationId = reader.GetFieldValue<Guid>(3);

            if (!reader.IsDBNull(4))
            {
                var layoutJson = reader.GetValue(4).ToString();
                if (!string.IsNullOrEmpty(layoutJson))
                {
                    try
                    {
                        rec.Layout = JsonDocument.Parse(layoutJson).RootElement.Clone();
                    }
                    catch
                    {
                        rec.Layout = null;
                    }
                }
            }

            return rec;
        }

        private static string? ToJsonString(JsonElement? elem)
        {
            if (elem == null)
            {
                return null;
            }

            try
            {
                return elem.Value.GetRawText();
            }
            catch
            {
                return null;
            }
        }

        private static void AddParameter(DbCommand cmd, string name, object? value)
        {
            var p = cmd.CreateParameter();
            p.ParameterName = name;
            p.Value = value ?? DBNull.Value;
            cmd.Parameters.Add(p);
        }
    }
}
