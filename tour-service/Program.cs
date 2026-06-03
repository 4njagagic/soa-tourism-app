using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using System.Text.Json.Serialization;
using TourService.Auth;
using TourService.Repositories;
using TourService.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel to expose a dedicated gRPC HTTP/2 endpoint when
// TOUR_SERVICE_GRPC_PORT is set. This allows internal gRPC clients to
// connect using plain HTTP/2 (insecure) within the container network.
builder.WebHost.ConfigureKestrel(options =>
{
    // Default HTTP endpoint (supports HTTP/1.1 and HTTP/2)
    var httpPort = int.Parse(Environment.GetEnvironmentVariable("TOUR_SERVICE_PORT") ?? "8083");
    options.ListenAnyIP(httpPort, listenOptions => { listenOptions.Protocols = HttpProtocols.Http1AndHttp2; });

    // Optional dedicated gRPC port for plain HTTP/2 (no TLS) for internal RPC
    var grpcPortStr = Environment.GetEnvironmentVariable("TOUR_SERVICE_GRPC_PORT");
    if (!string.IsNullOrEmpty(grpcPortStr) && int.TryParse(grpcPortStr, out var grpcPort))
    {
        options.ListenAnyIP(grpcPort, listenOptions => { listenOptions.Protocols = HttpProtocols.Http2; });
    }
});

builder.Configuration["TourDatabase:ConnectionString"] =
    Environment.GetEnvironmentVariable("TOUR_MONGO_URI") ?? builder.Configuration["TourDatabase:ConnectionString"];
builder.Configuration["TourDatabase:DatabaseName"] =
    Environment.GetEnvironmentVariable("TOUR_MONGO_DB_NAME") ?? builder.Configuration["TourDatabase:DatabaseName"];
builder.Configuration["Jwt:Secret"] =
    Environment.GetEnvironmentVariable("JWT_SECRET") ?? builder.Configuration["Jwt:Secret"];
builder.Configuration["Stakeholders:BaseUrl"] =
    Environment.GetEnvironmentVariable("STAKEHOLDERS_SERVICE_URL") ?? builder.Configuration["Stakeholders:BaseUrl"];
builder.Configuration["Purchase:BaseUrl"] =
    Environment.GetEnvironmentVariable("PURCHASE_SERVICE_URL") ?? builder.Configuration["Purchase:BaseUrl"];
builder.Configuration["Uploads:Directory"] =
    Environment.GetEnvironmentVariable("UPLOAD_DIR") ?? builder.Configuration["Uploads:Directory"];

builder.Services.Configure<TourDatabaseSettings>(builder.Configuration.GetSection("TourDatabase"));
builder.Services.AddSingleton<ITourRepository, MongoTourRepository>();
builder.Services.AddSingleton<ITourExecutionRepository, MongoTourExecutionRepository>();
builder.Services.AddSingleton<IUserPositionRepository, MongoUserPositionRepository>();
builder.Services.AddScoped<ITourService, TourManagementService>();
builder.Services.AddScoped<ITourExecutionService, TourExecutionService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPurchaseService, PurchaseService>();
builder.Services.AddHttpClient("stakeholders", client =>
{
    var baseUrl = builder.Configuration["Stakeholders:BaseUrl"] ?? "http://localhost:8081/api";
    client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
});
builder.Services.AddHttpClient("purchase", client =>
{
    var baseUrl = builder.Configuration["Purchase:BaseUrl"] ?? "http://localhost:8085/api";
    client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
});

builder.Services
    .AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddGrpc();
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

app.MapGrpcService<TourService.Grpc.TourExecutionGrpcService>();
app.MapControllers();

app.Run();

static string GetUploadDirectory(IConfiguration configuration, IWebHostEnvironment environment)
{
    var configured = configuration["Uploads:Directory"] ?? "uploads";
    return Path.IsPathRooted(configured)
        ? configured
        : Path.Combine(environment.ContentRootPath, configured);
}
