using System.Text.Json;

namespace DataEntryGen.Backend.Services.Layouts
{
    public static class LayoutTypes
    {
        public const string List = "list";
        public const string Detail = "detail";

        public static bool IsValid(string? type)
        {
            return string.Equals(type, List, StringComparison.OrdinalIgnoreCase)
                || string.Equals(type, Detail, StringComparison.OrdinalIgnoreCase);
        }

        public static string Normalize(string type)
        {
            if (string.Equals(type, List, StringComparison.OrdinalIgnoreCase))
            {
                return List;
            }

            return Detail;
        }
    }

    public class LayoutRecord
    {
        public Guid Id { get; set; }
        public required string Name { get; set; }
        public required string Type { get; set; }
        public Guid RegistrationId { get; set; }
        public JsonElement? Layout { get; set; }
    }
}
