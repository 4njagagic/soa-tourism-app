using TourService.DTOs;

namespace TourService.Services;

public interface ITourService
{
    Task<TourResponse> CreateTourAsync(CreateTourRequest request, string authorUsername, CancellationToken cancellationToken);

    Task<List<TourResponse>> GetAllToursAsync(CancellationToken cancellationToken);

    Task<List<TourResponse>> GetMyToursAsync(string authorUsername, CancellationToken cancellationToken);

    Task<TourResponse?> GetTourByIdAsync(string id, CancellationToken cancellationToken);

    Task<TourResponse?> GetMyTourAsync(string id, string authorUsername, CancellationToken cancellationToken);

    Task<TourResponse?> AddKeyPointAsync(string id, AddKeyPointRequest request, string authorUsername, CancellationToken cancellationToken);

    Task<TourResponse?> AddTransportTimeAsync(string id, AddTransportTimeRequest request, string authorUsername, CancellationToken cancellationToken);

    Task<TourResponse?> PublishTourAsync(string id, string authorUsername, CancellationToken cancellationToken);

    Task<TourResponse?> ArchiveTourAsync(string id, string authorUsername, CancellationToken cancellationToken);

    Task<TourResponse?> ReactivateTourAsync(string id, string authorUsername, CancellationToken cancellationToken);

    Task<TourResponse?> AddReviewAsync(string tourId, AddReviewRequest request, string touristUsername, CancellationToken cancellationToken);

    Task<TourResponse?> UpdateKeyPointAsync(string tourId, string pointId, UpdateKeyPointRequest request, string authorUsername, CancellationToken cancellationToken);
    Task<TourResponse?> DeleteKeyPointAsync(string tourId, string pointId, string authorUsername, CancellationToken cancellationToken);
}
