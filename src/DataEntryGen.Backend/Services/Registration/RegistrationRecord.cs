using System.Text.Json;

namespace DataEntryGen.Backend.Services.Registration
{
    public class RegistrationRecord
    {
        public Guid Id { get; set; }
        public required string TableName { get; set; }
        public string? Description { get; set; }
        public string? IdColumnName { get; set; }
        public JsonElement? Settings { get; set; }
        public JsonElement? DefaultData { get; set; }
    }
}
