using DataEntryGen.Backend.Services;
using DataEntryGen.Backend.Services.Registration;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace DataEntryGen.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RegistrationController : ControllerBase
    {
        private readonly IRegistrationRepository _repo;
        private readonly RegistrationInitializer _initializer;
        private readonly ISchemaDiscoveryService _discovery;
        private readonly ILogger<RegistrationController> _logger;

        public RegistrationController(IRegistrationRepository repo, RegistrationInitializer initializer, ISchemaDiscoveryService discovery, ILogger<RegistrationController> logger)
        {
            _repo = repo;
            _initializer = initializer;
            _discovery = discovery;
            _logger = logger;
        }

        [HttpPost("initialize")]
        public async Task<IActionResult> Initialize()
        {
            await _initializer.InitializeAsync();
            return Ok();
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var list = await _repo.GetAllAsync();
            return Ok(list);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var rec = await _repo.GetByIdAsync(id);
            return rec is null ? NotFound() : Ok(rec);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] RegistrationRecord record)
        {
            var created = await _repo.CreateAsync(record);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] RegistrationRecord record)
        {
            record.Id = id;
            var ok = await _repo.UpdateAsync(record);
            return ok ? NoContent() : NotFound();
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var ok = await _repo.DeleteAsync(id);
            return ok ? NoContent() : NotFound();
        }

        [HttpPost("discover")]
        public async Task<IActionResult> DiscoverAndRegister()
        {
            var added = new List<RegistrationRecord>();
            var tables = await _discovery.DiscoverTablesAsync();
            foreach (var t in tables)
            {
                if (t.Columns == null) continue;
                var pkCol = t.Columns.FirstOrDefault(c => c.IsPrimaryKey)?.Name;
                if (string.IsNullOrEmpty(pkCol))
                    continue;

                var rec = new RegistrationRecord
                {
                    Id = Guid.NewGuid(),
                    TableName = t.Name,
                    Description = null,
                    IdColumnName = pkCol,
                    Settings = JsonDocument.Parse("{\"generateId\":false}").RootElement.Clone(),
                    DefaultData = null
                };

                try
                {
                    var addedNow = await _repo.AddIfNotExistsAsync(rec);
                    if (addedNow) added.Add(rec);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to add registration for table {Table}", t.Name);
                }
            }

            return Ok(added);
        }
    }
}
