using TourService.DTOs;
using TourService.Models;
using TourService.Repositories;

namespace TourService.Services;

public class TourManagementService : ITourService
{
    private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp"
    };

    private readonly ITourRepository _repository;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public TourManagementService(ITourRepository repository, IConfiguration configuration, IWebHostEnvironment environment)
    {
        _repository = repository;
        _configuration = configuration;
        _environment = environment;
    }

    public async Task<TourResponse> CreateTourAsync(CreateTourRequest request, string authorUsername, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var tour = new Tour
        {
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            Difficulty = request.Difficulty.Trim(),
            Tags = NormalizeTags(request.Tags),
            Status = TourStatus.Draft,
            Price = 0,
            AuthorUsername = authorUsername,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _repository.CreateAsync(tour, cancellationToken);
        return TourResponse.FromTour(tour);
    }

    public async Task<List<TourResponse>> GetAllToursAsync(CancellationToken cancellationToken)
    {
        var tours = await _repository.GetAllAsync(cancellationToken);
        return tours.Select(TourResponse.FromTour).ToList();
    }

    public async Task<List<TourResponse>> GetMyToursAsync(string authorUsername, CancellationToken cancellationToken)
    {
        var tours = await _repository.GetByAuthorAsync(authorUsername, cancellationToken);
        return tours.Select(TourResponse.FromTour).ToList();
    }

    public async Task<TourResponse?> GetTourByIdAsync(string id, CancellationToken cancellationToken)
    {
        var tour = await _repository.GetByIdAsync(id, cancellationToken);
        return tour is null ? null : TourResponse.FromTour(tour);
    }

    public async Task<TourResponse?> GetMyTourAsync(string id, string authorUsername, CancellationToken cancellationToken)
    {
        var tour = await _repository.GetByIdAndAuthorAsync(id, authorUsername, cancellationToken);
        return tour is null ? null : TourResponse.FromTour(tour);
    }

    public async Task<TourResponse?> AddKeyPointAsync(string id, AddKeyPointRequest request, string authorUsername, CancellationToken cancellationToken)
    {
        if (request.Image is null || request.Image.Length == 0)
        {
            throw new InvalidOperationException("Image is required.");
        }

        var imageUrl = await SaveImageAsync(request.Image, cancellationToken);
        var keyPoint = new KeyPoint
        {
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            ImageUrl = imageUrl,
            CreatedAt = DateTime.UtcNow
        };

        var updated = await _repository.AddKeyPointAsync(id, authorUsername, keyPoint, cancellationToken);
        return updated is null ? null : TourResponse.FromTour(updated);
    }

    private static List<string> NormalizeTags(IEnumerable<string> tags)
    {
        return tags
            .Select(t => t.Trim())
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private async Task<string> SaveImageAsync(IFormFile image, CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(image.FileName);
        if (!AllowedImageExtensions.Contains(extension))
        {
            throw new InvalidOperationException("Unsupported image type.");
        }

        var uploadDirectory = GetUploadDirectory();
        Directory.CreateDirectory(uploadDirectory);

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var path = Path.Combine(uploadDirectory, fileName);

        await using var stream = File.Create(path);
        await image.CopyToAsync(stream, cancellationToken);

        return $"/uploads/{fileName}";
    }

    private string GetUploadDirectory()
    {
        var configured = _configuration["Uploads:Directory"] ?? "uploads";
        return Path.IsPathRooted(configured)
            ? configured
            : Path.Combine(_environment.ContentRootPath, configured);
    }
}
