namespace DataEntryGen.Backend.Services.Registration
{
    public class RegistrationInitializer
    {
        private readonly IRegistrationRepository _repo;

        public RegistrationInitializer(IRegistrationRepository repo)
        {
            _repo = repo;
        }

        public Task InitializeAsync()
        {
            return _repo.InitializeAsync();
        }
    }
}
