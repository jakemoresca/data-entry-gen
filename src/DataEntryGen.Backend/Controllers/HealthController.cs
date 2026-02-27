using Microsoft.AspNetCore.Mvc;

namespace DataEntryGen.Backend.Controllers;

[ApiController]
public class HealthController : ControllerBase
{
    [HttpGet("api/ping")]
    public ActionResult<string> Ping() => Ok("pong");
}
