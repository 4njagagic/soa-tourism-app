using System.ComponentModel.DataAnnotations;

namespace TourService.DTOs;

public class CreateTourRequest
{
    [Required]
    [StringLength(120, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(4000, MinimumLength = 10)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [StringLength(50, MinimumLength = 2)]
    public string Difficulty { get; set; } = string.Empty;

    public List<string> Tags { get; set; } = [];
}
