using Microsoft.AspNetCore.Mvc;
using DataEntryGen.Backend.Data;
using Microsoft.EntityFrameworkCore;

namespace DataEntryGen.Backend.Controllers;

[ApiController]
public class AdminController : ControllerBase
{
    private readonly DataEntryDbContext _db;

    public AdminController(DataEntryDbContext db)
    {
        _db = db;
    }

    [HttpPost("api/admin/reset-data")]
    public async Task<ActionResult> ResetAllData()
    {
        try
        {
            var entityTypes = _db.Model.GetEntityTypes();
            foreach (var entityType in entityTypes)
            {
                var tableName = entityType.GetTableName();
                if (!string.IsNullOrEmpty(tableName))
                {
                    await _db.Database.ExecuteSqlRawAsync($"TRUNCATE TABLE \"{tableName}\" CASCADE");
                }
            }
            return Ok(new { message = "All data deleted successfully" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
