using DataEntryGen.Backend.Services;
using DataEntryGen.Backend.Services.Layouts;
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
        private readonly ILayoutRepository _layoutRepo;
        private readonly RegistrationInitializer _initializer;
        private readonly LayoutTemplateService _layoutTemplates;
        private readonly ISchemaDiscoveryService _discovery;
        private readonly ILogger<RegistrationController> _logger;

        public RegistrationController(IRegistrationRepository repo, ILayoutRepository layoutRepo, RegistrationInitializer initializer, LayoutTemplateService layoutTemplates, ISchemaDiscoveryService discovery, ILogger<RegistrationController> logger)
        {
            _repo = repo;
            _layoutRepo = layoutRepo;
            _initializer = initializer;
            _layoutTemplates = layoutTemplates;
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

            try
            {
                var schema = await _discovery.GetTableSchemaAsync(created.TableName);
                if (schema is not null)
                {
                    var listLayout = _layoutTemplates.BuildDefaultListLayout(created, schema);
                    var detailLayout = _layoutTemplates.BuildDefaultDetailLayout(created, schema);
                    await _layoutRepo.AddIfNameNotExistsAsync(listLayout);
                    await _layoutRepo.AddIfNameNotExistsAsync(detailLayout);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to create default layouts for registration {RegistrationId}", created.Id);
            }

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
            await _layoutRepo.DeleteByRegistrationIdAsync(id);
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
                    if (!addedNow)
                    {
                        continue;
                    }

                    added.Add(rec);

                    var listLayout = _layoutTemplates.BuildDefaultListLayout(rec, t);
                    var detailLayout = _layoutTemplates.BuildDefaultDetailLayout(rec, t);

                    await _layoutRepo.AddIfNameNotExistsAsync(listLayout);
                    await _layoutRepo.AddIfNameNotExistsAsync(detailLayout);
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
