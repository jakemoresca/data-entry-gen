using Microsoft.EntityFrameworkCore;

namespace DataEntryGen.Backend.Data
{
    /// <summary>
    /// Generic Entity Framework Core DbContext for the Data Entry application.
    /// This context manages the connection to the PostgreSQL database without hardcoded models.
    /// All data access is dynamic based on database schema discovery.
    /// </summary>
    public class DataEntryDbContext : DbContext
    {
        public DataEntryDbContext(DbContextOptions<DataEntryDbContext> options)
            : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            // No hardcoded model configurations - schema driven approach
        }
    }
}
