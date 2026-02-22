using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using DataEntryGen.Frontend;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

// Configure HttpClient for backend API communication
// In development with Aspire, the backend URL will be resolved from service discovery
var httpClient = new HttpClient { BaseAddress = new Uri("https://localhost:5001") };
builder.Services.AddScoped(sp => httpClient);

// Alternative: For production, you might want to use the HostEnvironment.BaseAddress or configuration
// builder.Services.AddHttpClient("API", client =>
// {
//     client.BaseAddress = new Uri(builder.HostEnvironment.BaseAddress);
// });
