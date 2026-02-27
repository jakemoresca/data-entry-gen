using System.Text.Json;

namespace DataEntryGen.Backend.Services.Registration
{
    public interface IRegistrationRepository
    {
        Task InitializeAsync();
        Task<List<RegistrationRecord>> GetAllAsync();
        Task<RegistrationRecord?> GetByIdAsync(Guid id);
        Task<RegistrationRecord> CreateAsync(RegistrationRecord record);
        Task<bool> UpdateAsync(RegistrationRecord record);
        Task<bool> DeleteAsync(Guid id);
        Task<bool> AddIfNotExistsAsync(RegistrationRecord record);
    }
}
