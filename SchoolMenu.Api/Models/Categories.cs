using System.Text.Json.Serialization;

namespace SchoolMenu.Api.Models
{
    public class Categories
    {
        public int Id { get; set; }

        public string Name { get; set; } = "";

        public string? Description { get; set; }
        [JsonIgnore]
        public ICollection<MenuItem> Products { get; set; } = new List<MenuItem>();
    }
}
