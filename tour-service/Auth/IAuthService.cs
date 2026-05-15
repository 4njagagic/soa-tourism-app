namespace TourService.Auth;

public interface IAuthService
{
    Task<AuthenticatedAuthor?> RequireGuideAsync(HttpRequest request, CancellationToken cancellationToken);

    Task<AuthenticatedAuthor?> RequireAuthenticatedAsync(HttpRequest request, CancellationToken cancellationToken);
}
