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
}
