namespace DataEntryGen.Backend.Services.Layouts
{
    public interface ILayoutRepository
    {
        Task InitializeAsync();
        Task<List<LayoutRecord>> GetAllAsync();
        Task<List<LayoutRecord>> GetByRegistrationIdAsync(Guid registrationId);
        Task<LayoutRecord?> GetByIdAsync(Guid id);
        Task<LayoutRecord> CreateAsync(LayoutRecord record);
        Task<bool> UpdateAsync(LayoutRecord record);
        Task<bool> DeleteAsync(Guid id);
        Task<int> DeleteByRegistrationIdAsync(Guid registrationId);
        Task<bool> AddIfNameNotExistsAsync(LayoutRecord record);
    }
}
