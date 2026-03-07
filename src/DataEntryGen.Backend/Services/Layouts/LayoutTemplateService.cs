using DataEntryGen.Backend.Services.Registration;
using System.Text.Json;

namespace DataEntryGen.Backend.Services.Layouts
{
    public class LayoutTemplateService
    {
        public LayoutRecord BuildDefaultListLayout(RegistrationRecord registration, TableInfo table)
        {
            var layout = new
            {
                title = $"{table.Name} List",
                layoutType = "table",
                layout = table.Columns.Select(c => new
                {
                    column = c.Name,
                    label = c.Name,
                    value = c.Name,
                    disabled = false,
                    columnWidth = 30,
                    displayType = "label"
                }).ToList()
            };

            return new LayoutRecord
            {
                Id = Guid.NewGuid(),
                Name = $"{table.Name} - list",
                Type = LayoutTypes.List,
                RegistrationId = registration.Id,
                Layout = ToJsonElement(layout)
            };
        }

        public LayoutRecord BuildDefaultDetailLayout(RegistrationRecord registration, TableInfo table)
        {
            var layout = new
            {
                title = $"{table.Name} Details",
                layoutType = "form",
                layout = table.Columns.Select(c => new
                {
                    column = c.Name,
                    label = c.Name,
                    value = c.Name,
                    disabled = c.IsPrimaryKey,
                    columnWidth = 30,
                    displayType = ResolveDetailDisplayType(c)
                }).ToList()
            };

            return new LayoutRecord
            {
                Id = Guid.NewGuid(),
                Name = $"{table.Name} - detail",
                Type = LayoutTypes.Detail,
                RegistrationId = registration.Id,
                Layout = ToJsonElement(layout)
            };
        }

        private static JsonElement ToJsonElement(object value)
        {
            return JsonSerializer.SerializeToElement(value);
        }

        private static string ResolveDetailDisplayType(ColumnInfo column)
        {
            if (column.IsPrimaryKey)
            {
                return "label";
            }

            var type = column.DataType.ToLowerInvariant();

            if (type.Contains("int") || type.Contains("numeric") || type.Contains("decimal") || type.Contains("real") || type.Contains("double"))
            {
                return "number";
            }

            if (type.Contains("json") || type == "text")
            {
                return "textarea";
            }

            return "text";
        }
    }
}
