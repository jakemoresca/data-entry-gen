using DataEntryGen.Backend.Services.Layouts;
using Microsoft.AspNetCore.Mvc;

namespace DataEntryGen.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LayoutsController : ControllerBase
    {
        private readonly ILayoutRepository _repo;

        public LayoutsController(ILayoutRepository repo)
        {
            _repo = repo;
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

        [HttpGet("registration/{registrationId:guid}")]
        public async Task<IActionResult> GetByRegistration(Guid registrationId)
        {
            var list = await _repo.GetByRegistrationIdAsync(registrationId);
            return Ok(list);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] LayoutRecord record)
        {
            var error = Validate(record);
            if (error is not null)
            {
                return BadRequest(new { error });
            }

            var created = await _repo.CreateAsync(record);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] LayoutRecord record)
        {
            record.Id = id;
            var error = Validate(record);
            if (error is not null)
            {
                return BadRequest(new { error });
            }

            var ok = await _repo.UpdateAsync(record);
            return ok ? NoContent() : NotFound();
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var ok = await _repo.DeleteAsync(id);
            return ok ? NoContent() : NotFound();
        }

        private static string? Validate(LayoutRecord record)
        {
            if (string.IsNullOrWhiteSpace(record.Name))
            {
                return "Name is required.";
            }

            if (!LayoutTypes.IsValid(record.Type))
            {
                return "Type must be either 'list' or 'detail'.";
            }

            if (record.RegistrationId == Guid.Empty)
            {
                return "RegistrationId is required.";
            }

            if (record.Layout is null)
            {
                return "Layout JSON is required.";
            }

            return null;
        }
    }
}
