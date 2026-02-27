using Microsoft.AspNetCore.Mvc;
using DataEntryGen.Backend.Services;

namespace DataEntryGen.Backend.Controllers;

[ApiController]
public class SchemaController : ControllerBase
{
    private readonly ISchemaDiscoveryService _schemaService;

    public SchemaController(ISchemaDiscoveryService schemaService)
    {
        _schemaService = schemaService;
    }

    [HttpGet("api/schema/tables")]
    public async Task<ActionResult<List<TableInfo>>> GetAllTables()
    {
        var tables = await _schemaService.DiscoverTablesAsync();
        return Ok(tables);
    }

    [HttpGet("api/schema/tables/{tableName}")]
    public async Task<ActionResult<TableInfo?>> GetTableSchema(string tableName)
    {
        var schema = await _schemaService.GetTableSchemaAsync(tableName);
        return schema == null ? NotFound($"Table '{tableName}' not found") : Ok(schema);
    }
}
