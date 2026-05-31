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
    private readonly IAuthService _authService;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter() },
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public RpcController(ITourService tourService, IAuthService authService)
    {
        _tourService = tourService;
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
