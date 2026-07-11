using Microsoft.AspNetCore.Mvc;
using SchoolMenu.Api.Data;
using SchoolMenu.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace SchoolMenu.Api.Controllers;

[ApiController]
[Route("api/categories")]
public class CategoriesController : ControllerBase
{

    private readonly AppDbContext _context;

    public CategoriesController(AppDbContext context)
    {
        _context = context;
    }


    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var result = new
        {
            Products = await _context.MenuItems.CountAsync(),
            Categories = await _context.Categories.CountAsync()
        };

        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var categories = await _context.Categories
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Description,
                ProductCount = c.Products.Count()
            })
            .ToListAsync();

        return Ok(categories);
    }


    [HttpPost]
    public async Task<ActionResult<Categories>> Create(Categories category)
    {
        _context.Categories.Add(category);

        await _context.SaveChangesAsync();

        return Ok(category);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "kitchen")]
    public async Task<IActionResult> Update(int id, [FromBody] Categories updatedCategory)
    {
        var category = await _context.Categories.FindAsync(id);

        if (category == null)
            return NotFound();


        if (string.IsNullOrWhiteSpace(updatedCategory.Name))
            return BadRequest(new { message = "Name is required" });


        category.Name = updatedCategory.Name;
        category.Description = updatedCategory.Description;


        await _context.SaveChangesAsync();


        return Ok(category);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "kitchen")]
    public async Task<IActionResult> Delete(int id)
    {
        var category = await _context.Categories
            .Include(c => c.Products)
            .FirstOrDefaultAsync(c => c.Id == id);


        if (category == null)
            return NotFound();


        if (category.Products.Any())
        {
            return BadRequest(new
            {
                message = "Cannot delete category because it has products."
            });
        }


        _context.Categories.Remove(category);

        await _context.SaveChangesAsync();


        return Ok(new
        {
            message = "Category deleted"
        });
    }
}
