using Microsoft.AspNetCore.Mvc;
using TourService.Auth;
using TourService.DTOs;
using TourService.Models;
using TourService.Services;

namespace TourService.Controllers;

[ApiController]
[Route("api/tours")]
public class ToursController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ITourService _tourService;
    private readonly IPurchaseService _purchaseService;

    public ToursController(IAuthService authService, ITourService tourService, IPurchaseService purchaseService)
    {
        _authService = authService;
        _tourService = tourService;
        _purchaseService = purchaseService;
    }

    private static string? ExtractBearerToken(HttpRequest request)
    {
        var authorization = request.Headers.Authorization.ToString();
        const string prefix = "Bearer ";
        if (string.IsNullOrWhiteSpace(authorization) || !authorization.StartsWith(prefix, StringComparison.Ordinal))
        {
            return null;
        }

        return authorization[prefix.Length..].Trim();
    }

    [HttpPost]
    public async Task<ActionResult<TourResponse>> CreateTour([FromBody] CreateTourRequest request, CancellationToken cancellationToken)
    {
        var author = await _authService.RequireGuideAsync(Request, cancellationToken);
        if (author is null)
        {
            return Unauthorized(new { error = "Only authenticated guides can manage tours." });
        }

        var tour = await _tourService.CreateTourAsync(request, author.Username, cancellationToken);
        return CreatedAtAction(nameof(GetTour), new { id = tour.Id }, tour);
    }

    [HttpGet]
    public async Task<ActionResult> GetAllTours(CancellationToken cancellationToken)
    {
        var user = await _authService.RequireAuthenticatedAsync(Request, cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required." });
        }

        var tours = await _tourService.GetAllToursAsync(cancellationToken);
        if (string.Equals(user.Role, "TOURIST", StringComparison.OrdinalIgnoreCase))
        {
            var token = ExtractBearerToken(Request);
            var published = tours.Where(t => t.Status == TourStatus.Published).ToList();
            var result = new List<object>();

            foreach (var tour in published)
            {
                var purchased = await _purchaseService.HasPurchasedAsync(tour.Id, token ?? string.Empty, cancellationToken);
                result.Add(purchased ? tour : TourTouristResponse.FromResponse(tour));
            }

            return Ok(result);
        }

        return Ok(tours);
    }

    [HttpGet("mine")]
    public async Task<ActionResult<List<TourResponse>>> GetMyTours(CancellationToken cancellationToken)
    {
        var author = await _authService.RequireGuideAsync(Request, cancellationToken);
        if (author is null)
        {
            return Unauthorized(new { error = "Only authenticated guides can view their tours." });
        }

        return await _tourService.GetMyToursAsync(author.Username, cancellationToken);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetTour(string id, CancellationToken cancellationToken)
    {
        var user = await _authService.RequireAuthenticatedAsync(Request, cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required." });
        }

        var tour = await _tourService.GetTourByIdAsync(id, cancellationToken);
        if (tour is null)
        {
            return NotFound(new { error = "Tour not found." });
        }

        if (string.Equals(user.Role, "GUIDE", StringComparison.OrdinalIgnoreCase) && tour.AuthorUsername == user.Username)
        {
            return Ok(tour);
        }

        if (tour.Status == TourStatus.Published)
        {
            var token = ExtractBearerToken(Request);
            var purchased = await _purchaseService.HasPurchasedAsync(id, token ?? string.Empty, cancellationToken);
            return Ok(purchased ? tour : TourTouristResponse.FromResponse(tour));
        }

        return NotFound(new { error = "Tour not found." });
    }

    [HttpPost("{id}/key-points")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<TourResponse>> AddKeyPoint(string id, [FromForm] AddKeyPointRequest request, CancellationToken cancellationToken)
    {
        var author = await _authService.RequireGuideAsync(Request, cancellationToken);
        if (author is null)
        {
            return Unauthorized(new { error = "Only authenticated guides can manage tours." });
        }

        try
        {
            var tour = await _tourService.AddKeyPointAsync(id, request, author.Username, cancellationToken);
            return tour is null ? NotFound(new { error = "Tour not found." }) : tour;
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id}/transport-times")]
    public async Task<ActionResult<TourResponse>> AddTransportTime(string id, [FromBody] AddTransportTimeRequest request, CancellationToken cancellationToken)
    {
        var author = await _authService.RequireGuideAsync(Request, cancellationToken);
        if (author is null)
        {
            return Unauthorized(new { error = "Only authenticated guides can manage tours." });
        }

        try
        {
            var tour = await _tourService.AddTransportTimeAsync(id, request, author.Username, cancellationToken);
            return tour is null ? NotFound(new { error = "Tour not found." }) : tour;
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id}/publish")]
    public async Task<ActionResult<TourResponse>> PublishTour(string id, CancellationToken cancellationToken)
    {
        var author = await _authService.RequireGuideAsync(Request, cancellationToken);
        if (author is null)
        {
            return Unauthorized(new { error = "Only authenticated guides can publish tours." });
        }

        try
        {
            var tour = await _tourService.PublishTourAsync(id, author.Username, cancellationToken);
            return tour is null ? NotFound(new { error = "Tour not found." }) : tour;
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id}/archive")]
    public async Task<ActionResult<TourResponse>> ArchiveTour(string id, CancellationToken cancellationToken)
    {
        var author = await _authService.RequireGuideAsync(Request, cancellationToken);
        if (author is null)
        {
            return Unauthorized(new { error = "Only authenticated guides can archive tours." });
        }

        try
        {
            var tour = await _tourService.ArchiveTourAsync(id, author.Username, cancellationToken);
            return tour is null ? NotFound(new { error = "Tour not found." }) : tour;
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id}/reactivate")]
    public async Task<ActionResult<TourResponse>> ReactivateTour(string id, CancellationToken cancellationToken)
    {
        var author = await _authService.RequireGuideAsync(Request, cancellationToken);
        if (author is null)
        {
            return Unauthorized(new { error = "Only authenticated guides can reactivate tours." });
        }

        try
        {
            var tour = await _tourService.ReactivateTourAsync(id, author.Username, cancellationToken);
            return tour is null ? NotFound(new { error = "Tour not found." }) : tour;
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id}/reviews")]
[RequestSizeLimit(20 * 1024 * 1024)] //20MB limit zbog vise slika
public async Task<ActionResult<TourResponse>> AddReview(string id, [FromForm] AddReviewRequest request, CancellationToken cancellationToken)
{
    var user = await _authService.RequireAuthenticatedAsync(Request, cancellationToken);
    if (user is null)
    {
        return Unauthorized(new { error = "Only authenticated tourists can leave reviews." });
    }

    var tour = await _tourService.AddReviewAsync(id, request, user.Username, cancellationToken);
    return tour is null ? NotFound(new { error = "Tour not found." }) : tour;
}

[HttpPut("{id}/key-points/{pointId}")]
[RequestSizeLimit(10 * 1024 * 1024)]
public async Task<ActionResult<TourResponse>> UpdateKeyPoint(string id, string pointId, [FromForm] UpdateKeyPointRequest request, CancellationToken cancellationToken)
{
    var author = await _authService.RequireGuideAsync(Request, cancellationToken);
    if (author is null) return Unauthorized(new { error = "Only guides can manage points." });

    try
    {
        var tour = await _tourService.UpdateKeyPointAsync(id, pointId, request, author.Username, cancellationToken);
        return tour is null ? NotFound(new { error = "Tour or point not found." }) : tour;
    }
    catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
}

[HttpDelete("{id}/key-points/{pointId}")]
public async Task<ActionResult<TourResponse>> DeleteKeyPoint(string id, string pointId, CancellationToken cancellationToken)
{
    var author = await _authService.RequireGuideAsync(Request, cancellationToken);
    if (author is null) return Unauthorized(new { error = "Only guides can delete points." });

    var tour = await _tourService.DeleteKeyPointAsync(id, pointId, author.Username, cancellationToken);
    return tour is null ? NotFound(new { error = "Tour not found." }) : tour;
}
}
