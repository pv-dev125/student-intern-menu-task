using Microsoft.AspNetCore.Mvc;
using SchoolMenu.Api.Data;
using SchoolMenu.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace SchoolMenu.Api.Controllers;


[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{

    private readonly AppDbContext _context;


    public CategoriesController(AppDbContext context)
    {
        _context = context;
    }


    [HttpGet]
    public async Task<ActionResult<IEnumerable<Categories>>> GetCategories()
    {
        return Ok(await _context.Categories.ToListAsync());
    }


    [HttpPost]
    public async Task<ActionResult<Categories>> Create(Categories category)
    {
        _context.Categories.Add(category);

        await _context.SaveChangesAsync();

        return Ok(category);
    }


}
