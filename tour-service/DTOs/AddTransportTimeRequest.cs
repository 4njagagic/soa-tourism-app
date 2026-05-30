using System.ComponentModel.DataAnnotations;
using TourService.Models;

namespace TourService.DTOs;

public class AddTransportTimeRequest
{
    [Required]
    public TransportType Type { get; set; }

    [Range(1, 1440)]
    public int DurationMinutes { get; set; }
}
