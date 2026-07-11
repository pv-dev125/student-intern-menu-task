// ============================================================
//  admin.js - страницата на кухнята (admin.html)
//
//  ТУК ИМА РАБОТЕЩ ПРИМЕР за ЦЕЛИЯ път на записа:
//    HTML форма -> api.js postMenuItem() -> POST /api/menuitems
//    -> MenuItemsController.Create() -> SaveChangesAsync() -> menu.db
//
//  ЗАДАЧА 1 (основната ти задача!) е най-долу: направи по
//  СЪЩИЯ начин формата за дневно меню.
// ============================================================

// --- "Пазач" на страницата: само кухнята има достъп ---
let selectedDate = new Date();

function formatDate(date) {
    return date.toISOString().split("T")[0];
}

function updateDateDisplay() {
    const options = {
        day: "2-digit",
        month: "long",
        year: "numeric"
    };
    document.getElementById("selected-date").textContent =
        selectedDate.toLocaleDateString("en-GB", options);
}

async function loadDailyMenu() {
    const date = formatDate(selectedDate);
    document.getElementById("selected-date").textContent = date;
    try {
        const menu = await getMenuForDate(date);
        document.getElementById("products-list").innerHTML = `
            <tr>
                <td>${menu.soup.name}</td>
                <td>Soup</td>
                <td>${menu.soup.allergens ?? "-"}</td>
            </tr>

            <tr>
                <td>${menu.mainCourse.name}</td>
                <td>Main</td>
                <td>${menu.mainCourse.allergens ?? "-"}</td>
            </tr>

            <tr>
                <td>${menu.dessert.name}</td>
                <td>Dessert</td>
                <td>${menu.dessert.allergens ?? "-"}</td>
            </tr>
        `;
    }
    catch {

        document.getElementById("products-list").innerHTML = `
            <tr>
                <td colspan="3">
                    No menu available
                </td>
            </tr>
        `;
    }
}

async function loadCategories() {

    try {

        const categories = await getCategories();

        document.getElementById("categories-list").innerHTML =
            categories.map(category => `
            
            <tr>
                <td>${category.name}</td>
                <td>0</td>
                <td>
                    <button onclick="editCategory(${category.id})">
                        Edit
                    </button>

                    <button onclick="deleteCategoryAdmin(${category.id})">
                        Delete
                    </button>
                </td>
            </tr>

            `).join("");

    }
    catch (err) {

        console.error(err);

    }

}

async function editCategory(id) {

    const categories = await getCategories();

    const category = categories.find(
        c => c.id === id
    );


    if (!category)
        return;


    const name = prompt(
        "Category name:",
        category.name
    );


    if (!name)
        return;


    const description = prompt(
        "Description:",
        category.description ?? ""
    );


    await updateCategory(id, {
        name: name,
        description: description
    });


    alert("Category updated");


    loadCategories();
}



async function deleteCategoryAdmin(id) {

    if (!confirm("Delete this category?"))
        return;


    try {

        await deleteCategory(id);

        alert("Category deleted");

        loadCategories();

    }
    catch (error) {

        alert(error.message);

    }
}

async function guard() {
  const user = await getCurrentUser();   // от api.js
  if (!user || user.role !== "kitchen") {
    window.location.href = "login.html"; // не си влязъл -> към login
    return null;
  }
  document.getElementById("who").textContent = user.username;
  return user;
}

const addProductForm = document.getElementById("add-product-form");

// --- РАБОТЕЩ ПРИМЕР: добавяне на ново ястие ---

async function loadProducts() {

    const products = await getMenuItems();

    document.getElementById("products-list").innerHTML =
        products.map(product => `

        <tr>
            <td>${product.name}</td>

            <td>
                ${product.category.name}
            </td>

            <td>
                ${product.allergens ?? "-"}
            </td>

            <td>
                <button onclick="editProduct(${product.id})">
                    ✏️ Edit
                </button>

                <button onclick="deleteProduct(${product.id})">
                    🗑 Delete
                </button>
            </td>
        </tr>

        `).join("");

}

async function deleteProduct(id) {

    if (!confirm("Delete this product?"))
        return;

    try {

        const response = await fetch(`/api/menuitems/${id}`, {
            method: "DELETE"
        });

        if (!response.ok)
            throw new Error("Delete failed");


        alert("Product deleted");

        loadProducts();

    }
    catch (err) {

        alert(err.message);

    }
}


async function editProduct(id) {

    console.log("Editing product:", id);

    const products = await getMenuItems();

    const product = products.find(p => p.id === id);

    console.log("Found product:", product);

    if (!product) {
        alert("Product not found");
        return;
    }


    document.getElementById("product-name").value =
        product.name ?? "";


    document.getElementById("product-allergens").value =
        product.allergens ?? "";


    document.getElementById("product-date").value =
        product.date
            ? product.date.substring(0, 10)
            : "";


    document.getElementById("product-category").value =
        product.category.id;


    document.getElementById("product-description").value =
        product.description ?? "";

    document.getElementById("product-price").value =
        product.price ?? 0;

    document.getElementById("product-weight").value =
        product.weight ?? 0;


    const hidden = document.getElementById("editing-product-id");

    if (hidden) {
        hidden.value = product.id;
    }
    else {
        console.error("Missing editing-product-id input");
    }


    const button = document.getElementById("save-product-button");

    if (button) {
        button.innerText = "Update Product";
    }


    showSection("add-product-section");
}

async function loadCategoryDropdown() {

    const select = document.getElementById("product-category");

    if (!select) {
        return;
    }

    try {

        const categories = await getCategories();


        select.innerHTML = `
            <option value="">
                Select category
            </option>
        `;


        categories.forEach(category => {

            select.innerHTML += `
                <option value="${category.id}">
                    ${category.name}
                </option>
            `;

        });

    }
    catch (error) {

        console.error("Could not load categories:", error);

    }

}

if (addProductForm) {

    addProductForm.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();


            const item = {

                name: document.getElementById("product-name").value,

                type: "",

                description:
                    document.getElementById("product-description").value,

                categoryId:
                    Number(document.getElementById("product-category").value),

                allergens:
                    document.getElementById("product-allergens").value || null,

                price:
                    Number(document.getElementById("product-price").value),

                weight:
                    Number(document.getElementById("product-weight").value),

                date:
                    document.getElementById("product-date").value

            };


            const id =
                document.getElementById("editing-product-id").value;


            try {

                if (id) {

                    console.log(item);

                    await fetch(`/api/menuitems/${id}`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(item)
                    });

                    alert("Product updated");

                }
                else {

                    await postMenuItem(item);

                    alert("Product added successfully");

                }


                this.reset();

                document.getElementById("editing-product-id").value = "";

                showSection("products-section");

            }
            catch (err) {

                alert(err.message);

            }

        }
    );

}

const addCategoryForm =
    document.getElementById("add-category-form");


if (addCategoryForm) {

    addCategoryForm.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();


            const category = {

                name:
                    document.getElementById("category-name").value,


                description:
                    document.getElementById("category-description").value || null

            };


            try {

                await postCategory(category);


                alert("Category added successfully");


                this.reset();


                showSection("categories-section");


            }
            catch (err) {

                alert(err.message);

            }

        }
    );

}

const previousDay = document.getElementById("previous-day");

if (previousDay) {
    previousDay.addEventListener("click", () => {

        selectedDate.setDate(
            selectedDate.getDate() - 1
        );

        updateDateDisplay();
        loadProductsForDate();

    });
}

async function loadProductsForDate() {

    const date = formatDate(selectedDate);

    const products = await getMenuItemsForDate(date);


    document.getElementById("products-list").innerHTML =
        products.map(product => `

        <tr>
            <td>${product.name}</td>

            <td>
                ${product.category?.name ?? "-"}
            </td>

            <td>
                ${product.allergens ?? "-"}
            </td>

            <td>
                <button onclick="editProduct(${product.id})">
                    ✏️ Edit
                </button>

                <button onclick="deleteProduct(${product.id})">
                    🗑 Delete
                </button>
            </td>
        </tr>

        `).join("");

}

const nextDay = document.getElementById("next-day");

if (nextDay) {
    nextDay.addEventListener("click", () => {

        selectedDate.setDate(
            selectedDate.getDate() + 1
        );

        updateDateDisplay();
        loadProductsForDate();

    });
}

const todayButton = document.getElementById("today-button");

if (todayButton) {
    todayButton.addEventListener("click", () => {

        selectedDate = new Date();

        updateDateDisplay();
        loadProductsForDate();

    });
}

function showSection(sectionId) {

    const sections = [
        document.getElementById("dashboard-section"),
        document.getElementById("products-section"),
        document.getElementById("categories-section"),
        document.getElementById("add-product-section"),
        document.getElementById("add-category-section")
    ];

    sections.forEach(section => {
        if (section) {
            section.classList.add("hidden");
        }
    });

    const selectedSection = document.getElementById(sectionId);

    if (selectedSection) {
        selectedSection.classList.remove("hidden");
    }

    if (sectionId === "products-section") {
        loadProducts();
    }

    if (sectionId === "add-product-section") {
        loadCategoryDropdown();
    }
    if (sectionId === "categories-section") {
        loadCategories();
    }
}

window.showSection = showSection;

// --- Изход ---
document.getElementById("btn-logout").addEventListener("click", async () => {
  await logout();
  window.location.href = "index.html";
});

// --- Старт на страницата ---
guard().then(user => {
    if (!user)
        return;
    updateDateDisplay();
    showSection("dashboard-section");
});

async function updateCategory(id, category) {

    const response = await fetch(
        `/api/categories/${id}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(category)
        }
    );


    if (!response.ok) {
        throw new Error("Failed to update category");
    }


    return await response.json();
}



async function deleteCategory(id) {

    const response = await fetch(
        `/api/categories/${id}`,
        {
            method: "DELETE"
        }
    );


    const data = await response.json();


    if (!response.ok) {
        throw new Error(data.message || "Failed to delete category");
    }


    return data;
}

// ═══════════════════════════════════════════════════════════
//  ЗАДАЧА 1: Форма "Създай дневно меню"
//
//  Сървърът е ГОТОВ (POST /api/menu), api.js има postMenu().
//  Остава само формата. План:
//
//  1. В admin.html (секцията "Дневно меню") направи форма с:
//       - <input type="date" id="menu-date-input">
//       - три <select> за супа / основно / десерт
//         (id: select-soup, select-main, select-dessert)
//       - <input id="menu-notes"> за бележки
//       - бутон "Публикувай"
//
//  2. Напълни трите <select> с ястията от базата. Подсказка:
//       const items = await getMenuItems();
//       const soups = items.filter(i => i.type === "soup");
//       document.getElementById("select-soup").innerHTML = soups
//         .map(i => `<option value="${i.id}">${i.name}</option>`)
//         .join("");
//     (същото за main и dessert - или си направи обща функция!)
//
//  3. При submit на формата извикай postMenu(...):
//       await postMenu({
//         date: document.getElementById("menu-date-input").value,
//         soupId: Number(document.getElementById("select-soup").value),
//         mainCourseId: ...,
//         dessertId: ...,
//         notes: document.getElementById("menu-notes").value || null,
//       });
//     ВНИМАНИЕ: value на <select> е ТЕКСТ ("3"), а сървърът иска
//     число - затова Number(...)!
//
//  4. Провери резултата: отвори index.html и избери същата дата.
//     Ако менюто се вижда - ГОТОВО, целият кръг работи! 🎉
// ═══════════════════════════════════════════════════════════
