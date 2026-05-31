using TourService.Models;

namespace TourService.DTOs;

public record TourPurchaseValidationResponse(
    string Id,
    string Name,
    decimal Price,
    TourStatus Status);
