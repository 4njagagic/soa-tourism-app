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

        var tour = await _repository.GetByIdAndAuthorAsync(id, authorUsername, cancellationToken);
        if (tour is null)
        {
            return null;
        }

        var imageUrl = await SaveImageAsync(request.Image, cancellationToken);
        var keyPoint = new KeyPoint
        {
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            ImageUrl = imageUrl,
            CreatedAt = DateTime.UtcNow,
            Order = tour.KeyPoints.Count + 1
        };

        tour.KeyPoints.Add(keyPoint);
        RecalculateDistances(tour);
        tour.UpdatedAt = DateTime.UtcNow;

        var updated = await _repository.UpdateAsync(tour, cancellationToken);
        return updated is null ? null : TourResponse.FromTour(updated);
    }

    public async Task<TourResponse?> AddTransportTimeAsync(string id, AddTransportTimeRequest request, string authorUsername, CancellationToken cancellationToken)
    {
        var tour = await _repository.GetByIdAndAuthorAsync(id, authorUsername, cancellationToken);
        if (tour is null)
        {
            return null;
        }

        tour.TransportTimes.Add(new TransportTime
        {
            Type = request.Type,
            DurationMinutes = request.DurationMinutes
        });
        tour.UpdatedAt = DateTime.UtcNow;

        var updated = await _repository.UpdateAsync(tour, cancellationToken);
        return updated is null ? null : TourResponse.FromTour(updated);
    }

    public async Task<TourResponse?> PublishTourAsync(string id, string authorUsername, CancellationToken cancellationToken)
    {
        var tour = await _repository.GetByIdAndAuthorAsync(id, authorUsername, cancellationToken);
        if (tour is null)
        {
            return null;
        }

        if (tour.Status == TourStatus.Published)
        {
            return TourResponse.FromTour(tour);
        }

        if (string.IsNullOrWhiteSpace(tour.Name) || string.IsNullOrWhiteSpace(tour.Description) || string.IsNullOrWhiteSpace(tour.Difficulty) || !tour.Tags.Any())
        {
            throw new InvalidOperationException("Tour must have name, description, difficulty, and tags before publishing.");
        }

        if (tour.KeyPoints.Count < 2)
        {
            throw new InvalidOperationException("Tour must contain at least two key points before publishing.");
        }

        if (!tour.TransportTimes.Any())
        {
            throw new InvalidOperationException("Tour must include at least one transport time before publishing.");
        }

        tour.Status = TourStatus.Published;
        tour.PublishedAt = DateTime.UtcNow;
        tour.ArchivedAt = null;
        tour.UpdatedAt = DateTime.UtcNow;

        var updated = await _repository.UpdateAsync(tour, cancellationToken);
        return updated is null ? null : TourResponse.FromTour(updated);
    }

    public async Task<TourResponse?> ArchiveTourAsync(string id, string authorUsername, CancellationToken cancellationToken)
    {
        var tour = await _repository.GetByIdAndAuthorAsync(id, authorUsername, cancellationToken);
        if (tour is null)
        {
            return null;
        }

        if (tour.Status != TourStatus.Published)
        {
            throw new InvalidOperationException("Only published tours can be archived.");
        }

        tour.Status = TourStatus.Archived;
        tour.ArchivedAt = DateTime.UtcNow;
        tour.UpdatedAt = DateTime.UtcNow;

        var updated = await _repository.UpdateAsync(tour, cancellationToken);
        return updated is null ? null : TourResponse.FromTour(updated);
    }

    public async Task<TourResponse?> ReactivateTourAsync(string id, string authorUsername, CancellationToken cancellationToken)
    {
        var tour = await _repository.GetByIdAndAuthorAsync(id, authorUsername, cancellationToken);
        if (tour is null)
        {
            return null;
        }

        if (tour.Status != TourStatus.Archived)
        {
            throw new InvalidOperationException("Only archived tours can be reactivated.");
        }

        tour.Status = TourStatus.Published;
        tour.ArchivedAt = null;
        tour.UpdatedAt = DateTime.UtcNow;

        var updated = await _repository.UpdateAsync(tour, cancellationToken);
        return updated is null ? null : TourResponse.FromTour(updated);
    }

    private static void RecalculateDistances(Tour tour)
    {
        var ordered = tour.KeyPoints.OrderBy(kp => kp.Order).ToList();
        decimal total = 0;

        for (var index = 0; index < ordered.Count; index++)
        {
            if (index == 0)
            {
                ordered[index].DistanceFromPreviousKm = 0;
            }
            else
            {
                var previous = ordered[index - 1];
                ordered[index].DistanceFromPreviousKm = CalculateDistanceKm(
                    previous.Latitude,
                    previous.Longitude,
                    ordered[index].Latitude,
                    ordered[index].Longitude);
            }

            ordered[index].Order = index + 1;
            total += ordered[index].DistanceFromPreviousKm;
        }

        tour.KeyPoints = ordered;
        tour.TotalDistanceKm = total;
    }

    private static decimal CalculateDistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double EarthRadiusKm = 6371.0;
        static double ToRadians(double degrees) => degrees * Math.PI / 180.0;

        var latRad1 = ToRadians(lat1);
        var lonRad1 = ToRadians(lon1);
        var latRad2 = ToRadians(lat2);
        var lonRad2 = ToRadians(lon2);
        var dLat = latRad2 - latRad1;
        var dLon = lonRad2 - lonRad1;

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(latRad1) * Math.Cos(latRad2)
              * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return (decimal)(EarthRadiusKm * c);
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

    public async Task<TourResponse?> AddReviewAsync(string tourId, AddReviewRequest request, string touristUsername, CancellationToken cancellationToken)
    {
        var imageUrls = new List<string>();

        if (request.Images != null && request.Images.Any())
        {
            foreach (var file in request.Images)
            {
                var url = await SaveImageAsync(file, cancellationToken);
                imageUrls.Add(url);
            }
        }

        var review = new Review
        {
            Rating = request.Rating,
            Comment = request.Comment.Trim(),
            TouristUsername = touristUsername,
            VisitDate = request.VisitDate,
            Images = imageUrls
        };

        var updated = await _repository.AddReviewAsync(tourId, review, cancellationToken);
        return updated is null ? null : TourResponse.FromTour(updated);
    }

    public async Task<TourResponse?> UpdateKeyPointAsync(string tourId, string pointId, UpdateKeyPointRequest request, string authorUsername, CancellationToken cancellationToken)
    {
        var tour = await _repository.GetByIdAndAuthorAsync(tourId, authorUsername, cancellationToken);
        if (tour == null) return null;

        var existingPoint = tour.KeyPoints.FirstOrDefault(kp => kp.Id == pointId);
        if (existingPoint == null) throw new InvalidOperationException("Key point not found.");

        string imageUrl = existingPoint.ImageUrl;
        if (request.Image != null && request.Image.Length > 0)
        {
            imageUrl = await SaveImageAsync(request.Image, cancellationToken);
        }

        existingPoint.Name = request.Name.Trim();
        existingPoint.Description = request.Description.Trim();
        existingPoint.Latitude = request.Latitude;
        existingPoint.Longitude = request.Longitude;
        existingPoint.ImageUrl = imageUrl;

        RecalculateDistances(tour);
        tour.UpdatedAt = DateTime.UtcNow;

        var result = await _repository.UpdateAsync(tour, cancellationToken);
        return result == null ? null : TourResponse.FromTour(result);
    }

    public async Task<TourResponse?> DeleteKeyPointAsync(string tourId, string pointId, string authorUsername, CancellationToken cancellationToken)
    {
        var tour = await _repository.GetByIdAndAuthorAsync(tourId, authorUsername, cancellationToken);
        if (tour is null)
        {
            return null;
        }

        tour.KeyPoints = tour.KeyPoints.Where(kp => kp.Id != pointId).ToList();
        RecalculateDistances(tour);
        tour.UpdatedAt = DateTime.UtcNow;

        var result = await _repository.UpdateAsync(tour, cancellationToken);
        return result == null ? null : TourResponse.FromTour(result);
    }

    public async Task<TourPurchaseValidationResponse?> ValidateTourForPurchaseAsync(string id, CancellationToken cancellationToken)
    {
        var tour = await _repository.GetByIdAsync(id, cancellationToken);
        if (tour is null)
        {
            return null;
        }

        if (tour.Status == TourStatus.Archived)
        {
            throw new InvalidOperationException("Archived tours cannot be purchased.");
        }

        if (tour.Status != TourStatus.Published)
        {
            throw new InvalidOperationException("Only published tours can be purchased.");
        }

        return new TourPurchaseValidationResponse(
            tour.Id ?? string.Empty,
            tour.Name,
            tour.Price,
            tour.Status);
    }
}
