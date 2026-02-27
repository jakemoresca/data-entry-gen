using Microsoft.AspNetCore.Mvc;
using DataEntryGen.Backend.Services;

namespace DataEntryGen.Backend.Controllers;

[ApiController]
public class DataController : ControllerBase
{
    private readonly IGenericDataService _dataService;

    public DataController(IGenericDataService dataService)
    {
        _dataService = dataService;
    }

    [HttpGet("api/data/{tableName}")]
    public async Task<ActionResult<List<Dictionary<string, object?>>>> GetAll(string tableName)
    {
        try
        {
            var records = await _dataService.GetAllRecordsAsync(tableName);
            return Ok(records);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("api/data/{tableName}/{id}")]
    public async Task<ActionResult<Dictionary<string, object?>?>> GetById(string tableName, string id)
    {
        try
        {
            var record = await _dataService.GetRecordByPrimaryKeyAsync(tableName, id);
            return record == null ? NotFound() : Ok(record);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("api/data/{tableName}")]
    public async Task<ActionResult> Insert(string tableName, [FromBody] Dictionary<string, object?> data)
    {
        try
        {
            var success = await _dataService.InsertRecordAsync(tableName, data);
            return success
                ? Created($"/api/data/{tableName}", new { message = "Record created" })
                : BadRequest(new { error = "Failed to insert record" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("api/data/{tableName}")]
    public async Task<ActionResult> Update(string tableName, [FromBody] Dictionary<string, object?> data)
    {
        try
        {
            var success = await _dataService.UpdateRecordAsync(tableName, data);
            return success
                ? Ok(new { message = "Record updated" })
                : BadRequest(new { error = "Failed to update record" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("api/data/{tableName}/{id}")]
    public async Task<ActionResult> Delete(string tableName, string id)
    {
        try
        {
            var success = await _dataService.DeleteRecordAsync(tableName, id);
            return success
                ? Ok(new { message = "Record deleted" })
                : NotFound(new { error = "Record not found" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
