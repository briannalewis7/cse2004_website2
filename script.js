const searchBtn = document.querySelector('#searchBtn')
const categorySelect = document.querySelector('#categorySelect')
const ingredientInput = document.querySelector('#ingredientInput')
const recipeResults = document.querySelector('#recipeResults')
const fallbackButtonContainer = document.querySelector('#fallbackButtonContainer')
const loadingMessage = document.querySelector('#loading')
const recipeModal = document.querySelector('#recipeModal')
const closeModal = document.querySelector('#closeModal')
const recipeTitle = document.querySelector('#recipeTitle')
const recipeImage = document.querySelector('#recipeImage')
const ingredientList = document.querySelector('#ingredientList')
const recipeInstructions = document.querySelector('#recipeInstructions')

const spoonacularApiKey = 'e7c83be67be245babae0ab9e06949f10' 

closeModal.addEventListener('click', () => { recipeModal.style.display = 'none' })
window.addEventListener('click', (e) => { if (e.target === recipeModal) recipeModal.style.display = 'none' })

searchBtn.addEventListener('click', fetchMealDBRecipes)

async function fetchMealDBRecipes() {
    const category = categorySelect.value
    const ingredientFilter = ingredientInput.value.trim().toLowerCase()

    recipeResults.innerHTML = ""
    loadingMessage.innerHTML = "<p>Searching recipes...</p>"
    fallbackButtonContainer.innerHTML = ""
    let meals = []

    // --- MealDB fetch ---
    try {
        const response = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=Dessert`)
        const data = await response.json()
        meals = data.meals || []

        if (category && category !== "Dessert") {
            meals = meals.filter(meal => meal.strMeal.toLowerCase().includes(category.toLowerCase()))
        }

        if (ingredientFilter && meals.length > 0) {
            const detailedMeals = await Promise.all(
                meals.map(meal => fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`).then(res => res.json()))
            )
            meals = detailedMeals
                .map(item => item.meals[0])
                .filter(meal => {
                    for (let i = 1; i <= 20; i++) {
                        const ing = meal[`strIngredient${i}`]
                        if (ing && ing.toLowerCase().includes(ingredientFilter)) return true
                    }
                    return false
                })
        }
    } catch (err) {
        console.error("MealDB error:", err)
    }

    // --- Check if MealDB has results ---
    if (!meals || meals.length === 0) {
        console.log("No MealDB results — calling Spoonacular automatically.")
        await fetchSpoonacularRecipes(true)
    } else {
        loadingMessage.innerHTML = ""

        displayRecipes(meals)

        // Add optional fallback button
        fallbackButtonContainer.innerHTML = `<button id="fallbackBtn">Show More Recipes from Spoonacular</button>`
        document.querySelector('#fallbackBtn').addEventListener('click', () => fetchSpoonacularRecipes(false))
    }
}
function displayRecipes(meals) {
    recipeResults.innerHTML = ''; // Clear previous results

    meals.forEach(meal => {
        const card = document.createElement('div');
        card.classList.add('recipe-card');

        // Create image element
        const img = document.createElement('img');
        const imageSrc = meal.strMealThumb || meal.image || '';

        if (imageSrc) {
            img.src = imageSrc;
            img.alt = meal.strMeal || meal.title || 'Recipe Image';

            // If image fails to load
            img.onerror = () => {
                img.remove();
                const fallback = document.createElement('div');
                fallback.textContent = "Image not available";
                fallback.classList.add('no-image');
                card.appendChild(fallback);
            };

            card.appendChild(img);
        } else {
            const fallback = document.createElement('div');
            fallback.textContent = "Image not available";
            fallback.classList.add('no-image');
            card.appendChild(fallback);
        }

        // Add recipe title
        const title = document.createElement('h3');
        title.innerHTML = meal.strMeal || meal.title || 'Unknown Recipe';
        card.appendChild(title);

        // Add click event listener
        card.addEventListener('click', () => {
            showRecipeDetails(meal.idMeal, meal.spoonacular ? 'spoonacular' : '');
        });

        recipeResults.appendChild(card);
    });
}

// --- Spoonacular fetch ---
async function fetchSpoonacularRecipes(auto = false) {
    const ingredientFilter = ingredientInput.value.trim().toLowerCase()
    const category = categorySelect.value
    if (!auto) loadingMessage.innerHTML = "<p>Fetching more recipes from Spoonacular...</p>"

    try {
        const query = ingredientFilter || category || 'dessert'
        const url = `https://api.spoonacular.com/recipes/complexSearch?apiKey=${spoonacularApiKey}&query=${encodeURIComponent(query)}&number=10&type=dessert`
        const response = await fetch(url)
        const data = await response.json()

        if (data.results && data.results.length > 0) {
            const spoonMeals = data.results.map(r => ({
                idMeal: r.id,
                strMeal: r.title,
                strMealThumb: r.image,
                spoonacular: true
            }))
            loadingMessage.innerHTML = ""
            displayRecipes(spoonMeals)
        } else {
            loadingMessage.innerHTML = ""
            recipeResults.innerHTML += "<p>No Spoonacular recipes found.</p>"
        }

    } catch (error) {
        console.error("Spoonacular fetch error:", error)
        recipeResults.innerHTML += "<p>Error fetching Spoonacular recipes.</p>"
    }

    // Remove fallback button if user clicked it
    fallbackButtonContainer.innerHTML = ""
}

function clickAddBtn(addBtn, ing) {
    addIngredientToList(ing); 
    addBtn.textContent = '✔';
    addBtn.disabled = true;
    addBtn.title = "item is already in shopping list"

}

// --- Show modal ---
async function showRecipeDetails(id, source) {
    if (source === 'spoonacular') {
        try {
            const url = `https://api.spoonacular.com/recipes/${id}/information?apiKey=${spoonacularApiKey}&includeNutrition=false`
            const resp = await fetch(url)
            const data = await resp.json()

            recipeTitle.textContent = data.title
            recipeImage.src = data.image

            ingredientList.innerHTML = "";

            if (data.extendedIngredients) {
                data.extendedIngredients.forEach(ing => {
                    const li = document.createElement('li');
                    li.textContent = `${ing.original} `;

                    const isAlreadyAdded = shoppingList.some(i => i.toLowerCase() === ing.name.toLowerCase());
                    const addBtn = document.createElement('button');

                    if (isAlreadyAdded) {
                        addBtn.textContent = '✔';
                        addBtn.disabled = true;
                        addBtn.title = "item is already in shopping list"
                        addBtn.classList.add('add-btn');

                    }
                    else {
                        // Create Add button
                        addBtn.textContent = '+';
                        addBtn.classList.add('add-btn');
                        addBtn.title = "click to add ingredient to shopping list"
                    }
                    // Add event listener
                    addBtn.addEventListener('click', () => {
                        clickAddBtn(addBtn, ing.name)
                    });

                    li.appendChild(addBtn);
                    ingredientList.appendChild(li);
                });
            }
            recipeInstructions.innerHTML = data.instructions || "Instructions not available."

            recipeModal.style.display = 'block'
        } catch (err) {
            alert("Error loading Spoonacular recipe details.")
            console.error(err)
        }
    } else {
        try {
            const resp = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`)
            const data = await resp.json()
            const meal = data.meals[0]

            recipeTitle.textContent = meal.strMeal
            recipeImage.src = meal.strMealThumb

            ingredientList.innerHTML = "";

            for (let i = 1; i <= 20; i++) {
                const ing = meal[`strIngredient${i}`];
                const measure = meal[`strMeasure${i}`];
                if (ing) {
                    const li = document.createElement('li');
                    li.textContent = `${ing} - ${measure} `;

                    const isAlreadyAdded = shoppingList.some(i => i.toLowerCase() === ing.toLowerCase());
                    const addBtn = document.createElement('button');

                    if (isAlreadyAdded) {
                        addBtn.textContent = '✔';
                        addBtn.classList.add('add-btn');

                        addBtn.disabled = true;
                        addBtn.title = "item is already in shopping list"
                    }
                    else {
                        // Create Add button
                        addBtn.textContent = '+';
                        addBtn.classList.add('add-btn');
                        addBtn.title = "click to add ingredient to shopping list"
                    }
                    // Add event listener
                    addBtn.addEventListener('click', () => {
                        clickAddBtn(addBtn, ing)
                    });

                    li.appendChild(addBtn);
                    ingredientList.appendChild(li);
                }
            }

            recipeInstructions.innerHTML = meal.strInstructions

            recipeModal.style.display = 'block'
        } catch (err) {
            alert("Error loading MealDB recipe details.")
            console.error(err)
        }
    }
}
// --- Shopping List Logic ---
const shoppingListBtn = document.querySelector('#shoppingListBtn')
const shoppingListPanel = document.querySelector('#shoppingListPanel')
const closeShoppingList = document.querySelector('#closeShoppingList')
const shoppingListItems = document.querySelector('#shoppingListItems')
const clearShoppingList = document.querySelector('#clearShoppingList')
const numItemsDisplay = document.querySelector('#numItems')
let numItems = JSON.parse(localStorage.getItem("numItems")) || 0
let shoppingList = JSON.parse(localStorage.getItem("shoppingList")) || []
updateCount(numItems)

function saveList() {
    localStorage.setItem("shoppingList", JSON.stringify(shoppingList))
    localStorage.setItem("numItems", JSON.stringify(numItems))
}

function renderShoppingList() {
    // Clear existing list
    shoppingListItems.innerHTML = "";

    shoppingList.forEach((item, index) => {
        // Create li element
        const li = document.createElement('li');
        li.textContent = item;

        // Create remove button
        const btn = document.createElement('button');
        btn.textContent = 'x';
        btn.classList.add('remove-btn');

        // Attach event listener
        btn.addEventListener('click', () => {
            removeItem(index);
        });

        // Append button to li, and li to the list
        li.appendChild(btn);
        shoppingListItems.appendChild(li);
    });
}


function removeItem(index) {
    shoppingList.splice(index, 1)
    numItems -= 1
    updateCount(numItems)
    saveList()
    renderShoppingList()
}

clearShoppingList.addEventListener('click', () => {
    shoppingList = []
    numItems = 0
    updateCount(numItems)
    saveList()
    renderShoppingList()
})

shoppingListBtn.addEventListener('click', () => {
    shoppingListPanel.classList.add('open')
    renderShoppingList()
})

closeShoppingList.addEventListener('click', () => {
    shoppingListPanel.classList.remove('open')
})

// Add ingredient to list (use inside showRecipeDetails)
function addIngredientToList(item) {
    const normalizedItem = item.trim().toLowerCase(); // normalize

    // Check if it’s already in the list
    if (!shoppingList.some(i => i.toLowerCase() === normalizedItem)) {
        shoppingList.push(item); // push original casing for display
        numItems += 1;
        updateCount(numItems);
        saveList();
        renderShoppingList();
    }
}

function updateCount(num) {
    numItemsDisplay.innerHTML = num
}