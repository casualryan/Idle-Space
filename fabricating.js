// fabricating.js
console.log('fabricating.js loaded');
console.log('window.inventory at the start:', window.inventory);
console.log('addInventoryChangeListener at the start:', typeof addInventoryChangeListener);

let isFabricating = false;
let fabricationInterval;
let currentRecipe;
let fabricationStartTime;
let fabricationProgressBar;
let stopFabricationButton;
let tooltipDiv;

document.addEventListener('DOMContentLoaded', () => {

    console.log('DOMContentLoaded event fired in fabricating.js');
    console.log('window.inventory inside DOMContentLoaded:', window.inventory);
    console.log('addInventoryChangeListener inside DOMContentLoaded:', typeof addInventoryChangeListener);
    // Assign DOM elements after the DOM is fully loaded
    fabricationProgressBar = document.getElementById('fabrication-progress-bar');
    stopFabricationButton = document.getElementById('stop-fabrication');

    if (stopFabricationButton) {
        stopFabricationButton.addEventListener('click', stopFabrication);
    } else {
        console.error('Stop Fabrication button not found.');
    }

    // Add the inventory change listener here
    addInventoryChangeListener(() => {
        if (currentScreen === 'fabrication-screen') {
            displayFabricationRecipes();
        }
    });

    // Display the recipes on the Fabrication screen
    displayFabricationRecipes();
});

// Listen for screen changes
window.addEventListener('screenChanged', (event) => {
    if (event.detail.screenId === 'fabrication-screen') {
        displayFabricationRecipes();
    }
});

function startFabrication(recipe) {
    if (isFabricating) {
        logMessage('Already fabricating an item.');
        return;
    }

    // Check if player has required materials
    if (!hasRequiredMaterials(recipe.ingredients)) {
        logMessage('You do not have the required materials to fabricate this item.');
        return;
    }

    isFabricating = true;
    currentRecipe = recipe;
    fabricationStartTime = Date.now();

    fabricationProgressBar.style.width = '0%';
    stopFabricationButton.style.display = 'block';

    // Update progress bar every 100ms
    fabricationInterval = setInterval(() => {
        updateFabricationProgress();
    }, 100);
}

function updateFabricationProgress() {
    if (!isFabricating) return;

    const elapsed = (Date.now() - fabricationStartTime) / 1000; // Convert to seconds
    const duration = currentRecipe.craftingTime || 0;
    const progressPercent = Math.min((elapsed / duration) * 100, 100);
    fabricationProgressBar.style.width = progressPercent + '%';

    if (elapsed >= duration) {
        completeFabrication();
    }
}

function completeFabrication() {
    clearInterval(fabricationInterval);
    isFabricating = false;
    stopFabricationButton.style.display = 'none';
    fabricationProgressBar.style.width = '0%';

    // Remove required materials from inventory
    removeMaterialsFromInventory(currentRecipe.ingredients);

    // Create the crafted item
    const itemTemplate = items.find(i => i.name === currentRecipe.name);
    if (itemTemplate) {
        const craftedItem = generateItemInstance(itemTemplate);
        addItemToInventory(craftedItem);
        logMessage(`You have fabricated: ${craftedItem.name}`);
    } else {
        console.error(`Item template not found for ${currentRecipe.name}`);
    }

    currentRecipe = null;
    updateInventoryDisplay();
    displayFabricationRecipes();
}

function stopFabrication() {
    if (isFabricating) {
        clearInterval(fabricationInterval);
        isFabricating = false;
        stopFabricationButton.style.display = 'none';
        fabricationProgressBar.style.width = '0%';
        logMessage('Fabrication stopped.');
        currentRecipe = null;
    }
}

function displayFabricationRecipes() {
    const categoriesDiv = document.getElementById('fabrication-categories');
    if (!categoriesDiv) {
        console.error('Fabrication categories div not found.');
        return;
    }
    categoriesDiv.innerHTML = ''; // Clear existing content

    // Organize recipes by category
    const categories = {};
    recipes.forEach(recipe => {
        if (!categories[recipe.category]) {
            categories[recipe.category] = [];
        }
        categories[recipe.category].push(recipe);
    });

    // Create sections for each category
    for (const categoryName in categories) {
        const categorySection = document.createElement('div');
        categorySection.className = 'fabrication-category';

        const categoryHeader = document.createElement('h3');
        categoryHeader.textContent = categoryName;
        categorySection.appendChild(categoryHeader);

        const recipeList = document.createElement('div');
        recipeList.className = 'recipe-list';

        categories[categoryName].forEach(recipe => {
            const recipeCard = createRecipeCard(recipe);
            if (recipeCard) {
                recipeList.appendChild(recipeCard);
            }
        });

        categorySection.appendChild(recipeList);
        categoriesDiv.appendChild(categorySection);
    }
}

function createRecipeCard(recipe) {
    const recipeCard = document.createElement('div');
    recipeCard.className = 'recipe-card';
    recipeCard.style.position = 'relative'; // Ensure relative positioning

    // Retrieve the item template from items.js
    const itemTemplate = items.find(i => i.name === recipe.name);
    if (!itemTemplate) {
        console.error(`Item template not found for ${recipe.name}`);
        return null;
    }

    // Recipe name
    const recipeName = document.createElement('h4');
    recipeName.textContent = recipe.name;
    recipeCard.appendChild(recipeName);

    // Recipe description from itemTemplate
    const recipeDescription = document.createElement('p');
    recipeDescription.textContent = itemTemplate.description || 'No description available.';
    recipeCard.appendChild(recipeDescription);

    // Ingredients list
    const ingredientsList = document.createElement('ul');
    for (const ingredientName in recipe.ingredients) {
        const requiredQuantity = recipe.ingredients[ingredientName];
        const inventoryItem = window.inventory.find(item => item.name === ingredientName);
        const playerQuantity = inventoryItem && inventoryItem.quantity ? inventoryItem.quantity : 0;

        const ingredientItem = document.createElement('li');
        ingredientItem.textContent = `${ingredientName}: ${playerQuantity}/${requiredQuantity}`;

        // Color coding
        ingredientItem.style.color = playerQuantity >= requiredQuantity ? 'green' : 'red';

        ingredientsList.appendChild(ingredientItem);
    }
    recipeCard.appendChild(ingredientsList);

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.innerHTML = getItemTooltipContent(itemTemplate);

    // Append tooltip to recipeCard
    recipeCard.appendChild(tooltip);

    // Add hover event listeners with delay
    let hoverTimeout;
    recipeCard.addEventListener('mouseenter', () => {
        hoverTimeout = setTimeout(() => {
            tooltip.style.display = 'block';
        }, 500); // 0.5-second delay
    });
    recipeCard.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimeout);
        tooltip.style.display = 'none';
    });

    // Fabricate button
    const fabricateButton = document.createElement('button');
    fabricateButton.textContent = 'Fabricate';
    fabricateButton.disabled = !hasRequiredMaterials(recipe.ingredients);
    fabricateButton.addEventListener('click', () => startFabrication(recipe));
    recipeCard.appendChild(fabricateButton);

    return recipeCard;
}


function hasRequiredMaterials(ingredients) {
    for (let materialName in ingredients) {
        const requiredQuantity = ingredients[materialName];
        const inventoryItem = window.inventory.find(item => item.name === materialName);
        const playerQuantity = inventoryItem && inventoryItem.quantity ? inventoryItem.quantity : 0;
        if (playerQuantity < requiredQuantity) {
            return false;
        }
    }
    return true;
}

function removeMaterialsFromInventory(ingredients) {
    for (let materialName in ingredients) {
        const requiredQuantity = ingredients[materialName];
        removeItemQuantityFromInventory(materialName, requiredQuantity);
    }
}

function removeItemQuantityFromInventory(itemName, quantity) {
    const inventoryItem = window.inventory.find(item => item.name === itemName);
    if (inventoryItem) {
        if (inventoryItem.stackable) {
            inventoryItem.quantity -= quantity;
            if (inventoryItem.quantity <= 0) {
                const index = window.inventory.indexOf(inventoryItem);
                if (index > -1) {
                    window.inventory.splice(index, 1);
                }
            }
        } else {
            const index = window.inventory.indexOf(inventoryItem);
            if (index > -1) {
                window.inventory.splice(index, 1);
            }
        }
    } else {
        console.warn(`Attempted to remove ${itemName} which is not in inventory.`);
    }
    updateInventoryDisplay();
    notifyInventoryChange();
}

function refundMaterials(ingredients) {
    for (let materialName in ingredients) {
        const quantity = ingredients[materialName];
        const materialTemplate = items.find(i => i.name === materialName);
        if (materialTemplate) {
            const materialItem = generateItemInstance(materialTemplate);
            materialItem.quantity = quantity;
            addItemToInventory(materialItem);
        } else {
            console.warn(`Material template not found: ${materialName}`);
        }
    }
    updateInventoryDisplay();
}

// function showRecipeTooltip(itemTemplate, parentElement) {
//     if (!tooltipDiv) {
//         tooltipDiv = document.createElement('div');
//         tooltipDiv.className = 'tooltip';
//         document.body.appendChild(tooltipDiv);
//     }

//     // Build tooltip content from itemTemplate
//     tooltipDiv.innerHTML = `
//         <strong>${itemTemplate.name}</strong><br>
//         ${itemTemplate.description || 'No description available.'}<br>
//         <strong>Stats:</strong><br>
//         ${formatItemStats(itemTemplate)}
//     `;

//     const rect = parentElement.getBoundingClientRect();
//     tooltipDiv.style.top = `${rect.top + window.scrollY}px`;
//     tooltipDiv.style.left = `${rect.right + 10 + window.scrollX}px`;
//     tooltipDiv.style.display = 'block';
// }

// function hideRecipeTooltip() {
//     if (tooltipDiv) {
//         tooltipDiv.style.display = 'none';
//     }
// }

function formatItemStats(itemTemplate) {
    const stats = [];

    if (itemTemplate.type === 'Weapon') {
        // Extract damage ranges from damageTypes
        if (itemTemplate.damageTypes) {
            for (const [damageType, damageValues] of Object.entries(itemTemplate.damageTypes)) {
                if (damageValues.min && damageValues.max) {
                    stats.push(`${capitalizeFirstLetter(damageType)} Damage: ${damageValues.min} - ${damageValues.max}`);
                }
            }
        }

        // Extract attack speed modifier
        if (itemTemplate.attackSpeedModifierRange) {
            const minSpeed = itemTemplate.attackSpeedModifierRange.min;
            const maxSpeed = itemTemplate.attackSpeedModifierRange.max;
            stats.push(`Attack Speed Modifier: ${minSpeed}% - ${maxSpeed}%`);
        }

        if (itemTemplate.criticalChanceModifierRange) {
            const minChance = itemTemplate.criticalChanceModifierRange.min;
            const maxChance = itemTemplate.criticalChanceModifierRange.max;
            stats.push(`Critical Chance Modifier: ${minChance}% - ${maxChance}%`);
        }

        if (itemTemplate.criticalMultiplierModifierRange) {
            const minMultiplier = itemTemplate.criticalMultiplierModifierRange.min;
            const maxMultiplier = itemTemplate.criticalMultiplierModifierRange.max;
            stats.push(`Critical Multiplier Modifier: ${minMultiplier}% - ${maxMultiplier}%`);
        }

        // Extract stat modifiers
        if (itemTemplate.statModifiers) {
            stats.push('<strong>Stat Modifiers:</strong>');
            if (itemTemplate.statModifiers.damageTypes) {
                for (const [damageType, modifierValues] of Object.entries(itemTemplate.statModifiers.damageTypes)) {
                    stats.push(`${capitalizeFirstLetter(damageType)} Damage Modifier: ${modifierValues.min}% - ${modifierValues.max}%`);
                }
            }
            // Include other stat modifiers if any
        }
    } else if (itemTemplate.type === 'Armor' || itemTemplate.type === 'Bionic') {
        // Handle defense types
        if (itemTemplate.defenseTypes) {
            for (const [defenseType, defenseValue] of Object.entries(itemTemplate.defenseTypes)) {
                stats.push(`${capitalizeFirstLetter(defenseType)} Defense: ${defenseValue}`);
            }
        }

        // Handle stat modifiers
        if (itemTemplate.statModifiers) {
            stats.push('<strong>Stat Modifiers:</strong>');
            // Include stat modifiers similar to above
        }
    }

    // Handle other item types as needed

    return stats.join('<br>');
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
