using Microsoft.AspNetCore.Mvc;
using TourService.Auth;
using TourService.DTOs;
using TourService.Services;

namespace TourService.Controllers;

[ApiController]
[Route("api/tours")]
public class ToursController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ITourService _tourService;

    public ToursController(IAuthService authService, ITourService tourService)
    {
        _authService = authService;
        _tourService = tourService;
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
    public async Task<ActionResult<List<TourResponse>>> GetAllTours(CancellationToken cancellationToken)
    {
        var user = await _authService.RequireAuthenticatedAsync(Request, cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required." });
        }

        return await _tourService.GetAllToursAsync(cancellationToken);
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
    public async Task<ActionResult<TourResponse>> GetTour(string id, CancellationToken cancellationToken)
    {
        var user = await _authService.RequireAuthenticatedAsync(Request, cancellationToken);
        if (user is null)
        {
            return Unauthorized(new { error = "Authentication required." });
        }

        var tour = await _tourService.GetTourByIdAsync(id, cancellationToken);
        return tour is null ? NotFound(new { error = "Tour not found." }) : tour;
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
