using Microsoft.AspNetCore.Mvc;
using TourService.Auth;
using TourService.Models;
using TourService.Repositories;

namespace TourService.Controllers;

[ApiController]
[Route("api/user-positions")]
public class UserPositionController : ControllerBase
{
    private readonly IUserPositionRepository _repository;
    private readonly IAuthService _authService;

    public UserPositionController(IUserPositionRepository repository, IAuthService _authService)
    {
        _repository = repository;
        this._authService = _authService;
    }

    [HttpGet("my")]
    public async Task<ActionResult<UserPosition>> GetMyPosition(CancellationToken cancellationToken)
    {
        var user = await _authService.RequireAuthenticatedAsync(Request, cancellationToken);
        if (user is null) return Unauthorized();

        var position = await _repository.GetByUsernameAsync(user.Username, cancellationToken);
        if (position == null) return NotFound(new { message = "Position not set yet." });
        
        return Ok(position);
    }

    [HttpPost("my")]
    public async Task<IActionResult> UpdateMyPosition([FromBody] PositionRequest request, CancellationToken cancellationToken)
    {
        var user = await _authService.RequireAuthenticatedAsync(Request, cancellationToken);
        if (user is null) return Unauthorized();

        var position = new UserPosition
        {
            Username = user.Username,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            UpdatedAt = DateTime.UtcNow
        };

        await _repository.UpsertAsync(position, cancellationToken);
        return Ok(position);
    }

    public record PositionRequest(double Latitude, double Longitude);
}