using DataEntryGen.Backend.Services.Layouts;

namespace DataEntryGen.Backend.Services.Registration
{
    public class RegistrationInitializer
    {
        private readonly IRegistrationRepository _repo;
        private readonly ILayoutRepository _layoutRepo;

        public RegistrationInitializer(IRegistrationRepository repo, ILayoutRepository layoutRepo)
        {
            _repo = repo;
            _layoutRepo = layoutRepo;
        }

        public async Task InitializeAsync()
        {
            await _repo.InitializeAsync();
            await _layoutRepo.InitializeAsync();
        }
    }
}
