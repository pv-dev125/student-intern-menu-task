using SchoolMenu.Api.Models;

namespace SchoolMenu.Api.Data;

public static class SeedData
{
    public static void Run(AppDbContext db)
    {
        // Ако вече има данни - не правим нищо
        if (db.Users.Any())
            return;

        // ==========================
        // Categories
        // ==========================
        var soups = new Categories
        {
            Name = "Soups",
            Description = "Soup dishes"
        };

        var mains = new Categories
        {
            Name = "Main Courses",
            Description = "Main dishes"
        };

        var desserts = new Categories
        {
            Name = "Desserts",
            Description = "Desserts"
        };

        db.Categories.AddRange(soups, mains, desserts);

        // ==========================
        // Users
        // ==========================
        db.Users.AddRange(
            new User
            {
                Username = "kitchen",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("kitchen123"),
                Role = "kitchen",
                DisplayName = "Кухня"
            },
            new User
            {
                Username = "student",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("student123"),
                Role = "student",
                DisplayName = "Ученик"
            });

        // ==========================
        // Menu Items
        // ==========================
        var bobChorba = new MenuItem
        {
            Name = "Боб чорба",
            Type = "soup",
            Allergens = "целина",
            Category = soups
        };

        var pileshkaSupa = new MenuItem
        {
            Name = "Пилешка супа",
            Type = "soup",
            Allergens = "яйца, глутен",
            Category = soups
        };

        var tarator = new MenuItem
        {
            Name = "Таратор",
            Type = "soup",
            Allergens = "мляко",
            Category = soups
        };

        var musaka = new MenuItem
        {
            Name = "Мусака",
            Type = "main",
            Allergens = "мляко, яйца",
            Category = mains
        };

        var pileSOriz = new MenuItem
        {
            Name = "Пиле с ориз",
            Type = "main",
            Category = mains
        };

        var spagetiBologneze = new MenuItem
        {
            Name = "Спагети Болонезе",
            Type = "main",
            Allergens = "глутен",
            Category = mains
        };

        var kiseloMlyako = new MenuItem
        {
            Name = "Кисело мляко с мед",
            Type = "dessert",
            Allergens = "мляко",
            Category = desserts
        };

        var yabalkovShtrudel = new MenuItem
        {
            Name = "Ябълков щрудел",
            Type = "dessert",
            Allergens = "глутен, яйца, мляко",
            Category = desserts
        };

        var biskvitenaTorta = new MenuItem
        {
            Name = "Бисквитена торта",
            Type = "dessert",
            Allergens = "глутен, мляко",
            Category = desserts
        };

        db.MenuItems.AddRange(
            bobChorba,
            pileshkaSupa,
            tarator,
            musaka,
            pileSOriz,
            spagetiBologneze,
            kiseloMlyako,
            yabalkovShtrudel,
            biskvitenaTorta);

        // ==========================
        // Daily Menus
        // ==========================
        db.DailyMenus.AddRange(
            new DailyMenu
            {
                Date = DateTime.Today,
                Soup = tarator,
                MainCourse = pileSOriz,
                Dessert = yabalkovShtrudel,
                Notes = "Добре дошли! Това меню е добавено автоматично."
            },
            new DailyMenu
            {
                Date = DateTime.Today.AddDays(1),
                Soup = bobChorba,
                MainCourse = musaka,
                Dessert = kiseloMlyako
            });

        db.SaveChanges();
    }
}