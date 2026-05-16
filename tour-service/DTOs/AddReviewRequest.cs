using System.ComponentModel.DataAnnotations;

namespace TourService.DTOs;

public class AddReviewRequest
{
    [Range(1, 5)]
    public int Rating { get; set; }

    [Required]
    [StringLength(2000, MinimumLength = 2)]
    public string Comment { get; set; } = string.Empty;

    [Required]
    public DateTime VisitDate { get; set; }

    public List<IFormFile>? Images { get; set; }
}