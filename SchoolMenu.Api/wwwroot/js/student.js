// ============================================================
//  student.js - logic for the public student menu page (index.html)
//
//  Uses the EXISTING api.js functions only - no API/route changes:
//    - getMenuItemsForDate(dateStr)   GET /api/menuitems?date=...
//
//  Adds:
//    - day navigation (prev / today / next)
//    - collapsible filter panel
//    - category checkboxes  -> unchecking hides that whole category
//    - allergen checkboxes  -> unchecking hides matching products
//    - text search
//    - category-grouped product grid (empty categories omitted)
//    - light/dark theme toggle + EN/BG language toggle (both persisted)
// ============================================================

// ---------------- Translations (UI chrome only - product data
// comes from the database as-is and is not machine-translated) ----------------

const translations = {
    en: {
        login: "Login",
        pageTitle: "AC Arcus School Cafeteria",
        subtitle: "Fresh meals prepared every day",
        prevDay: "Previous day",
        nextDay: "Next day",
        jumpToday: "Jump to today",
        filters: "Filters",
        search: "Search meals...",
        categories: "Categories",
        allergens: "Allergens",
        allergensLabel: "Allergens:",
        loading: "Loading menu…",
        noMenu: "The menu for this day hasn't been published yet. Check back later!",
        noMatch: "No meals match your filters right now.",
        noCategories: "No categories yet",
        noAllergens: "No allergen info for this day",
        resultsCount: (shown, total) => `Showing ${shown} of ${total} items`,
        weightUnit: "g",
        footer: "School Menu © 2026",
    },
    bg: {
        login: "Вход",
        pageTitle: "Училищен стол Арк Аркус",
        subtitle: "Прясна храна всеки ден",
        prevDay: "Предишен ден",
        nextDay: "Следващ ден",
        jumpToday: "Към днес",
        filters: "Филтри",
        search: "Търсене на ястия...",
        categories: "Категории",
        allergens: "Алергени",
        allergensLabel: "Алергени:",
        loading: "Зареждане на менюто…",
        noMenu: "Менюто за този ден все още не е публикувано. Провери по-късно!",
        noMatch: "Няма ястия, отговарящи на филтрите.",
        noCategories: "Все още няма категории",
        noAllergens: "Няма информация за алергени за този ден",
        resultsCount: (shown, total) => `Показани ${shown} от ${total}`,
        weightUnit: "г",
        footer: "Училищно меню © 2026",
    },
};

// Change this to switch the displayed currency symbol.
const CURRENCY_SYMBOL = "€";

// ---------------- State ----------------

let currentDate = new Date();
let itemsForDay = [];          // raw products returned by the API for currentDate
let hiddenCategories = new Set(); // categoryIds unchecked by the user
let hiddenAllergens = new Set();  // allergen names unchecked by the user
let searchTerm = "";
let currentLang = "en";

// ---------------- Helpers ----------------

// Date object -> "2026-07-07" (what the API expects)
function dateToStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function isSameDay(a, b) {
    return dateToStr(a) === dateToStr(b);
}

// "мляко, яйца" -> ["мляко", "яйца"]
function parseAllergens(str) {
    if (!str) return [];
    return str
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
}

function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[c]));
}

function t(key) {
    return translations[currentLang][key];
}

// ---------------- Theme (light / dark) ----------------

function initTheme() {
    const saved = localStorage.getItem("schoolmenu-theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved || (prefersDark ? "dark" : "light"));
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
    localStorage.setItem("schoolmenu-theme", theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    applyTheme(current === "dark" ? "light" : "dark");
}

// ---------------- Language (EN / BG) ----------------

function initLanguage() {
    currentLang = localStorage.getItem("schoolmenu-lang") || "en";
    applyTranslations();
}

function toggleLanguage() {
    currentLang = currentLang === "en" ? "bg" : "en";
    localStorage.setItem("schoolmenu-lang", currentLang);
    applyTranslations();
}

function applyTranslations() {
    document.documentElement.lang = currentLang;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.dataset.i18n;
        if (translations[currentLang][key]) el.textContent = translations[currentLang][key];
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.dataset.i18nPlaceholder;
        if (translations[currentLang][key]) el.placeholder = translations[currentLang][key];
    });

    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
        const key = el.dataset.i18nAria;
        if (translations[currentLang][key]) el.setAttribute("aria-label", translations[currentLang][key]);
    });

    document.getElementById("lang-toggle").textContent = currentLang === "en" ? "🌐 EN" : "🌐 BG";

    // Re-render pieces that build text at runtime (dates, empty states, counts).
    updateDateHeader();
    if (itemsForDay.length >= 0) renderMenu();
}

// ---------------- Day navigation ----------------

function updateDateHeader() {
    const locale = currentLang === "bg" ? "bg-BG" : "en-US";

    document.getElementById("menu-date").textContent =
        currentDate.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });

    document.getElementById("menu-weekday").textContent =
        currentDate.toLocaleDateString(locale, { weekday: "long" });

    const isToday = isSameDay(currentDate, new Date());
    document.getElementById("btn-today").classList.toggle("hidden", isToday);
}

function changeDay(offset) {
    currentDate.setDate(currentDate.getDate() + offset);
    reloadDay();
}

function goToToday() {
    currentDate = new Date();
    reloadDay();
}

// ---------------- Data loading ----------------

async function reloadDay() {
    updateDateHeader();

    const container = document.getElementById("menu-container");
    container.innerHTML = `<p class="loading">${t("loading")}</p>`;
    document.getElementById("results-count").classList.add("hidden");

    try {
        itemsForDay = await getMenuItemsForDate(dateToStr(currentDate));
    } catch (err) {
        console.error(err);
        itemsForDay = [];
        container.innerHTML = `<div class="alert">${t("noMenu")}</div>`;
        return;
    }

    // Fresh day -> nothing hidden until the student unchecks something.
    hiddenCategories = new Set();
    hiddenAllergens = new Set();

    renderFilters();
    renderMenu();
}

// ---------------- Rendering: filters ----------------

function getCategoriesForDay() {
    const categories = [];
    const seen = new Set();
    for (const item of itemsForDay) {
        const cat = item.category;
        if (cat && !seen.has(cat.id)) {
            seen.add(cat.id);
            categories.push(cat);
        }
    }
    return categories;
}

function getAllergensForDay() {
    const allergens = new Set();
    for (const item of itemsForDay) {
        parseAllergens(item.allergens).forEach((a) => allergens.add(a));
    }
    return [...allergens].sort();
}

function renderFilters() {
    renderCategoryFilters();
    renderAllergenFilters();
}

function renderCategoryFilters() {
    const wrap = document.getElementById("category-filters");
    const categories = getCategoriesForDay();

    if (categories.length === 0) {
        wrap.innerHTML = `<p class="empty-note">${t("noCategories")}</p>`;
        return;
    }

    wrap.innerHTML = categories
        .map(
            (c) => `
      <label class="filter-chip" data-category-id="${c.id}">
        <input type="checkbox" checked>
        <span>${escapeHtml(c.name)}</span>
      </label>`
        )
        .join("");

    wrap.querySelectorAll(".filter-chip").forEach((chip) => {
        const checkbox = chip.querySelector("input");
        const categoryId = Number(chip.dataset.categoryId);
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                hiddenCategories.delete(categoryId);
                chip.classList.remove("unchecked");
            } else {
                hiddenCategories.add(categoryId);
                chip.classList.add("unchecked");
            }
            renderMenu();
        });
    });
}

function renderAllergenFilters() {
    const wrap = document.getElementById("allergen-filters");
    const allergens = getAllergensForDay();

    if (allergens.length === 0) {
        wrap.innerHTML = `<p class="empty-note">${t("noAllergens")}</p>`;
        return;
    }

    wrap.innerHTML = allergens
        .map(
            (a) => `
      <label class="filter-chip" data-allergen="${escapeHtml(a)}">
        <input type="checkbox" checked>
        <span>${escapeHtml(a)}</span>
      </label>`
        )
        .join("");

    wrap.querySelectorAll(".filter-chip").forEach((chip) => {
        const checkbox = chip.querySelector("input");
        const allergen = chip.dataset.allergen;
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                hiddenAllergens.delete(allergen);
                chip.classList.remove("unchecked");
            } else {
                hiddenAllergens.add(allergen);
                chip.classList.add("unchecked");
            }
            renderMenu();
        });
    });
}

// ---------------- Rendering: products ----------------

function getFilteredItems() {
    const term = searchTerm.trim().toLowerCase();

    return itemsForDay.filter((item) => {
        if (item.category && hiddenCategories.has(item.category.id)) return false;

        if (term) {
            const haystack = `${item.name} ${item.description ?? ""}`.toLowerCase();
            if (!haystack.includes(term)) return false;
        }

        if (hiddenAllergens.size > 0) {
            const itemAllergens = parseAllergens(item.allergens);
            if (itemAllergens.some((a) => hiddenAllergens.has(a))) return false;
        }

        return true;
    });
}

function renderProductCard(item) {
    const allergenList = parseAllergens(item.allergens);

    const priceHtml = item.price
        ? `<span class="price-tag">${CURRENCY_SYMBOL}${Number(item.price).toFixed(2)}</span>`
        : "";
    const weightHtml = item.weight
        ? `<span class="weight-tag">${item.weight} ${t("weightUnit")}</span>`
        : "";

    const description = item.description
        ? `<p class="product-description">${escapeHtml(item.description)}</p>`
        : "";

    const allergensRow = allergenList.length
        ? `
      <div class="allergens-row">
        <span class="allergens-label">${t("allergensLabel")}</span>
        ${allergenList.map((a) => `<span class="allergen-badge">${escapeHtml(a)}</span>`).join("")}
      </div>`
        : "";

    return `
    <article class="product-card">
      <div class="card-top">
        ${priceHtml}
        ${weightHtml}
      </div>
      <h3 class="product-name">${escapeHtml(item.name)}</h3>
      ${description}
      ${allergensRow}
    </article>`;
}

function renderMenu() {
    const container = document.getElementById("menu-container");
    const resultsCount = document.getElementById("results-count");

    if (itemsForDay.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <span class="empty-emoji">🍽️</span>
        ${t("noMenu")}
      </div>`;
        resultsCount.classList.add("hidden");
        return;
    }

    const filtered = getFilteredItems();

    if (filtered.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <span class="empty-emoji">🔍</span>
        ${t("noMatch")}
      </div>`;
        resultsCount.classList.add("hidden");
        return;
    }

    // Group by category, preserving first-seen order. Categories with
    // no visible products after filtering are simply never added.
    const groups = [];
    const groupIndex = new Map();
    for (const item of filtered) {
        const catId = item.category ? item.category.id : "uncategorized";
        const catName = item.category ? item.category.name : "";
        if (!groupIndex.has(catId)) {
            groupIndex.set(catId, groups.length);
            groups.push({ name: catName, items: [] });
        }
        groups[groupIndex.get(catId)].items.push(item);
    }

    container.innerHTML = groups
        .map(
            (group) => `
      <section class="category-section">
        ${group.name ? `<h2 class="category-title">${escapeHtml(group.name)}</h2>` : ""}
        <div class="product-grid">
          ${group.items.map(renderProductCard).join("")}
        </div>
      </section>`
        )
        .join("");

    resultsCount.textContent = t("resultsCount")(filtered.length, itemsForDay.length);
    resultsCount.classList.remove("hidden");
}

// ---------------- Filters panel collapse/expand ----------------

function initFiltersToggle() {
    const panel = document.querySelector(".filters-panel");
    const toggle = document.getElementById("filters-toggle");

    panel.classList.add("open"); // expanded by default
    toggle.setAttribute("aria-expanded", "true");

    toggle.addEventListener("click", () => {
        const isOpen = panel.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(isOpen));
    });
}

// ---------------- Navbar scroll shadow + scroll-to-top ----------------

function initScrollEffects() {
    const navbar = document.getElementById("navbar");
    const scrollTopBtn = document.getElementById("scroll-top");

    window.addEventListener("scroll", () => {
        navbar.classList.toggle("scrolled", window.scrollY > 4);
        scrollTopBtn.classList.toggle("visible", window.scrollY > 300);
    });

    scrollTopBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

// ---------------- Wiring ----------------

function init() {
    initTheme();
    initLanguage();
    initFiltersToggle();
    initScrollEffects();

    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
    document.getElementById("lang-toggle").addEventListener("click", toggleLanguage);
    document.getElementById("btn-prev").addEventListener("click", () => changeDay(-1));
    document.getElementById("btn-next").addEventListener("click", () => changeDay(1));
    document.getElementById("btn-today").addEventListener("click", goToToday);

    let searchDebounce;
    document.getElementById("search-input").addEventListener("input", (e) => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            searchTerm = e.target.value;
            renderMenu();
        }, 150);
    });

    reloadDay();
}

init();