using Microsoft.Extensions.FileProviders;
using System.Text.Json.Serialization;
using TourService.Auth;
using TourService.Repositories;
using TourService.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration["TourDatabase:ConnectionString"] =
    Environment.GetEnvironmentVariable("TOUR_MONGO_URI") ?? builder.Configuration["TourDatabase:ConnectionString"];
builder.Configuration["TourDatabase:DatabaseName"] =
    Environment.GetEnvironmentVariable("TOUR_MONGO_DB_NAME") ?? builder.Configuration["TourDatabase:DatabaseName"];
builder.Configuration["Jwt:Secret"] =
    Environment.GetEnvironmentVariable("JWT_SECRET") ?? builder.Configuration["Jwt:Secret"];
builder.Configuration["Stakeholders:BaseUrl"] =
    Environment.GetEnvironmentVariable("STAKEHOLDERS_SERVICE_URL") ?? builder.Configuration["Stakeholders:BaseUrl"];
builder.Configuration["Uploads:Directory"] =
    Environment.GetEnvironmentVariable("UPLOAD_DIR") ?? builder.Configuration["Uploads:Directory"];

builder.Services.Configure<TourDatabaseSettings>(builder.Configuration.GetSection("TourDatabase"));
builder.Services.AddSingleton<ITourRepository, MongoTourRepository>();
builder.Services.AddScoped<ITourService, TourManagementService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddHttpClient("stakeholders", client =>
{
    var baseUrl = builder.Configuration["Stakeholders:BaseUrl"] ?? "http://localhost:8081/api";
    client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
});

builder.Services
    .AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins("http://localhost:3000", "http://localhost:3001")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors();

var uploadDirectory = GetUploadDirectory(app.Configuration, app.Environment);
Directory.CreateDirectory(uploadDirectory);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadDirectory),
    RequestPath = "/uploads"
});

app.MapControllers();

app.Run();

static string GetUploadDirectory(IConfiguration configuration, IWebHostEnvironment environment)
{
    var configured = configuration["Uploads:Directory"] ?? "uploads";
    return Path.IsPathRooted(configured)
        ? configured
        : Path.Combine(environment.ContentRootPath, configured);
}
