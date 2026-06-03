using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using TourService.DTOs;
using TourService.Services;
using TourService.Auth;

namespace TourService.Controllers;

[ApiController]
[Route("rpc")]
public class RpcController : ControllerBase
{
    private readonly ITourService _tourService;
    private readonly ITourExecutionService _tourExecutionService;
    private readonly IAuthService _authService;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter() },
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public RpcController(ITourService tourService, ITourExecutionService tourExecutionService, IAuthService authService)
    {
        _tourService = tourService;
        _tourExecutionService = tourExecutionService;
        _authService = authService;
    }

    [HttpPost]
    public async Task<IActionResult> HandleRpc(CancellationToken cancellationToken)
    {
        JsonRpcRequest? request;
        try
        {
            request = await JsonSerializer.DeserializeAsync<JsonRpcRequest>(Request.Body, JsonOptions, cancellationToken);
        }
        catch
        {
            return BadRequest(CreateError(-32700, "Parse error", null));
        }

        if (request is null || request.Jsonrpc != "2.0" || string.IsNullOrWhiteSpace(request.Method))
        {
            return BadRequest(CreateError(-32600, "Invalid Request", request?.Id));
        }

        if (string.Equals(request.Method, "ValidateTourForPurchase", StringComparison.Ordinal))
        {
            return await HandleValidateTourForPurchaseAsync(request, cancellationToken);
        }

        if (string.Equals(request.Method, "GetTourExecution", StringComparison.Ordinal))
        {
            var tourist = await RequireTouristAsync(request, cancellationToken);
            if (tourist is null)
            {
                return Unauthorized(CreateError(401, "Unauthorized", request.Id));
            }

            var executionId = GetRequiredStringParam(request, "id");
            if (executionId is null)
            {
                return BadRequest(CreateError(-32602, "Invalid params", request.Id));
            }

            var execution = await _tourExecutionService.GetExecutionAsync(executionId, tourist.Username, cancellationToken);
            return execution is null
                ? NotFound(CreateError(404, "Tour execution not found", request.Id))
                : Ok(CreateSuccess(execution, request.Id));
        }

        if (string.Equals(request.Method, "StartTourExecution", StringComparison.Ordinal) ||
            string.Equals(request.Method, "CheckNearbyKeyPoint", StringComparison.Ordinal) ||
            string.Equals(request.Method, "CompleteTourExecution", StringComparison.Ordinal) ||
            string.Equals(request.Method, "AbandonTourExecution", StringComparison.Ordinal))
        {
            var tourist = await RequireTouristAsync(request, cancellationToken);
            if (tourist is null)
            {
                return Unauthorized(CreateError(401, "Unauthorized", request.Id));
            }

            return request.Method switch
            {
                "StartTourExecution" => await HandleStartTourExecutionAsync(request, tourist.Username, cancellationToken),
                "CheckNearbyKeyPoint" => await HandleCheckNearbyKeyPointAsync(request, tourist.Username, cancellationToken),
                "CompleteTourExecution" => await HandleCompleteTourExecutionAsync(request, tourist.Username, cancellationToken),
                "AbandonTourExecution" => await HandleAbandonTourExecutionAsync(request, tourist.Username, cancellationToken),
                _ => BadRequest(CreateError(-32601, "Method not found", request.Id))
            };
        }
        if (string.Equals(request.Method, "RegisterPurchase", StringComparison.Ordinal))
{
    var tourId = GetRequiredStringParam(request, "tourId");
    var username = GetRequiredStringParam(request, "username");
    
    if (tourId == null || username == null) 
        return BadRequest(CreateError(-32602, "Invalid params", request.Id));

    var success = await _tourService.RegisterPurchaseAsync(tourId, username, cancellationToken);
    return success 
        ? Ok(CreateSuccess(new { status = "registered" }, request.Id))
        : NotFound(CreateError(404, "Tour not found", request.Id));
}

        AuthenticatedAuthor? author = await _authService.RequireGuideAsync(Request, cancellationToken);
        if (author is null)
        {
            return Unauthorized(CreateError(401, "Unauthorized", request.Id));
        }

        var id = request.Params?.GetProperty("id").GetString();
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(CreateError(-32602, "Invalid params", request.Id));
        }

        try
        {
            TourResponse? tour = request.Method switch
            {
                "PublishTour" => await _tourService.PublishTourAsync(id, author.Username, cancellationToken),
                "ArchiveTour" => await _tourService.ArchiveTourAsync(id, author.Username, cancellationToken),
                _ => null
            };

            if (tour is null)
            {
                return NotFound(CreateError(404, "Tour not found", request.Id));
            }

            return Ok(CreateSuccess(tour, request.Id));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(CreateError(400, ex.Message, request.Id));
        }
    }

    private async Task<IActionResult> HandleValidateTourForPurchaseAsync(JsonRpcRequest request, CancellationToken cancellationToken)
    {
        var id = request.Params?.GetProperty("id").GetString();
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(CreateError(-32602, "Invalid params", request.Id));
        }

        try
        {
            var validation = await _tourService.ValidateTourForPurchaseAsync(id, cancellationToken);
            if (validation is null)
            {
                return NotFound(CreateError(404, "Tour not found", request.Id));
            }

            return Ok(CreateSuccess(validation, request.Id));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(CreateError(400, ex.Message, request.Id));
        }
    }

    private async Task<IActionResult> HandleStartTourExecutionAsync(JsonRpcRequest request, string touristUsername, CancellationToken cancellationToken)
    {
        var tourId = GetRequiredStringParam(request, "tourId");
        var latitude = GetRequiredDoubleParam(request, "latitude");
        var longitude = GetRequiredDoubleParam(request, "longitude");

        if (tourId is null || latitude is null || longitude is null)
        {
            return BadRequest(CreateError(-32602, "Invalid params", request.Id));
        }

        try
        {
            var bearerToken = ExtractBearerToken(Request);
            var execution = await _tourExecutionService.StartTourExecutionAsync(tourId, touristUsername, latitude.Value, longitude.Value, bearerToken ?? string.Empty, cancellationToken);
            return execution is null
                ? NotFound(CreateError(404, "Tour not found", request.Id))
                : Ok(CreateSuccess(execution, request.Id));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(CreateError(400, ex.Message, request.Id));
        }
    }

    private async Task<IActionResult> HandleCheckNearbyKeyPointAsync(JsonRpcRequest request, string touristUsername, CancellationToken cancellationToken)
    {
        var executionId = GetRequiredStringParam(request, "executionId");
        var latitude = GetRequiredDoubleParam(request, "latitude");
        var longitude = GetRequiredDoubleParam(request, "longitude");

        if (executionId is null || latitude is null || longitude is null)
        {
            return BadRequest(CreateError(-32602, "Invalid params", request.Id));
        }

        try
        {
            var result = await _tourExecutionService.CheckNearbyKeyPointAsync(executionId, touristUsername, latitude.Value, longitude.Value, cancellationToken);
            return result is null
                ? NotFound(CreateError(404, "Tour execution not found", request.Id))
                : Ok(CreateSuccess(result, request.Id));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(CreateError(400, ex.Message, request.Id));
        }
    }

    private async Task<IActionResult> HandleCompleteTourExecutionAsync(JsonRpcRequest request, string touristUsername, CancellationToken cancellationToken)
    {
        var executionId = GetRequiredStringParam(request, "executionId");
        var latitude = GetRequiredDoubleParam(request, "latitude");
        var longitude = GetRequiredDoubleParam(request, "longitude");
        var force = GetOptionalBoolParam(request, "force") ?? false;

        if (executionId is null || latitude is null || longitude is null)
        {
            return BadRequest(CreateError(-32602, "Invalid params", request.Id));
        }

        try
        {
            var execution = await _tourExecutionService.CompleteTourExecutionAsync(executionId, touristUsername, latitude.Value, longitude.Value, force, cancellationToken);
            return execution is null
                ? NotFound(CreateError(404, "Tour execution not found", request.Id))
                : Ok(CreateSuccess(execution, request.Id));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(CreateError(400, ex.Message, request.Id));
        }
    }

    private async Task<IActionResult> HandleAbandonTourExecutionAsync(JsonRpcRequest request, string touristUsername, CancellationToken cancellationToken)
    {
        var executionId = GetRequiredStringParam(request, "executionId");
        var latitude = GetRequiredDoubleParam(request, "latitude");
        var longitude = GetRequiredDoubleParam(request, "longitude");

        if (executionId is null || latitude is null || longitude is null)
        {
            return BadRequest(CreateError(-32602, "Invalid params", request.Id));
        }

        try
        {
            var execution = await _tourExecutionService.AbandonTourExecutionAsync(executionId, touristUsername, latitude.Value, longitude.Value, cancellationToken);
            return execution is null
                ? NotFound(CreateError(404, "Tour execution not found", request.Id))
                : Ok(CreateSuccess(execution, request.Id));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(CreateError(400, ex.Message, request.Id));
        }
    }

    private async Task<AuthenticatedAuthor?> RequireTouristAsync(JsonRpcRequest request, CancellationToken cancellationToken)
    {
        var user = await _authService.RequireAuthenticatedAsync(Request, cancellationToken);
        if (user is null || !string.Equals(user.Role, "TOURIST", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return user;
    }

    private static string? GetRequiredStringParam(JsonRpcRequest request, string name)
    {
        try
        {
            var value = request.Params?.GetProperty(name).GetString();
            return string.IsNullOrWhiteSpace(value) ? null : value;
        }
        catch
        {
            return null;
        }
    }

    private static double? GetRequiredDoubleParam(JsonRpcRequest request, string name)
    {
        try
        {
            if (request.Params is not JsonElement paramsElement)
            {
                return null;
            }

            if (!paramsElement.TryGetProperty(name, out var value))
            {
                return null;
            }

            return value.ValueKind switch
            {
                JsonValueKind.Number when value.TryGetDouble(out var parsed) => parsed,
                JsonValueKind.String when double.TryParse(value.GetString(), out var parsed) => parsed,
                _ => null
            };
        }
        catch
        {
            return null;
        }
    }

    private static bool? GetOptionalBoolParam(JsonRpcRequest request, string name)
    {
        try
        {
            if (request.Params is not JsonElement paramsElement)
            {
                return null;
            }

            if (!paramsElement.TryGetProperty(name, out var value))
            {
                return null;
            }

            return value.ValueKind switch
            {
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.String when bool.TryParse(value.GetString(), out var parsed) => parsed,
                JsonValueKind.Number when value.TryGetInt32(out var num) => num != 0,
                _ => null
            };
        }
        catch
        {
            return null;
        }
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

    private static JsonRpcResponse CreateSuccess(object result, JsonElement? id)
    {
        return new JsonRpcResponse
        {
            Jsonrpc = "2.0",
            Result = result,
            Id = id
        };
    }

    private static JsonRpcResponse CreateError(int code, string message, JsonElement? id)
    {
        return new JsonRpcResponse
        {
            Jsonrpc = "2.0",
            Error = new JsonRpcError
            {
                Code = code,
                Message = message
            },
            Id = id
        };
    }

    public class JsonRpcRequest
    {
        public string Jsonrpc { get; set; } = string.Empty;
        public string Method { get; set; } = string.Empty;
        public JsonElement? Params { get; set; }
        public JsonElement? Id { get; set; }
    }

    public class JsonRpcResponse
    {
        public string Jsonrpc { get; set; } = "2.0";
        public object? Result { get; set; }
        public JsonRpcError? Error { get; set; }
        public JsonElement? Id { get; set; }
    }

    public class JsonRpcError
    {
        public int Code { get; set; }
        public string Message { get; set; } = string.Empty;
        public object? Data { get; set; }
    }
}
