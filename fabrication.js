// fabricating.js
console.log('fabricating.js loaded');
console.log('window.inventory at the start:', window.inventory);
console.log('addInventoryChangeListener at the start:', typeof addInventoryChangeListener);

const ongoingFabrications = {}; // Tracks active fabrications by recipe name

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired in fabricating.js');
    console.log('window.inventory inside DOMContentLoaded:', window.inventory);
    console.log('addInventoryChangeListener inside DOMContentLoaded:', typeof addInventoryChangeListener);

    // Add the inventory change listener
    addInventoryChangeListener(() => {
        if (currentScreen === 'fabrication-screen') {
            displayFabricationRecipes();
        }
    });

    // Display the recipes on the Fabrication screen
    displayFabricationRecipes();
});

// Listen for screen changes to update fabrication recipes
window.addEventListener('screenChanged', (event) => {
    if (event.detail.screenId === 'fabrication-screen') {
        displayFabricationRecipes();
    }
});

// Function to start fabrication for a specific recipe
function startFabrication(recipe, button, progressBar) {
    if (ongoingFabrications[recipe.name]) {
        logMessage(`Already fabricating ${recipe.name}.`);
        return;
    }

    // Check if player has required materials
    if (!hasRequiredMaterials(recipe.ingredients)) {
        logMessage('You do not have the required materials to fabricate this item.');
        return;
    }

    // Deduct materials from inventory
    removeMaterialsFromInventory(recipe.ingredients);

    // Update inventory display
    updateInventoryDisplay();

    // Change button text to "Stop Fabrication"
    const buttonTextElement = button.querySelector('.button-text');
    if (buttonTextElement) {
        buttonTextElement.textContent = 'Stop Fabrication';
    } else {
        console.error('Button text element not found.');
    }

    // Show and reset progress bar
    progressBar.style.display = 'block';
    progressBar.style.width = '0%';

    // Set fabrication duration in milliseconds (convert seconds to ms)
    const fabricationDuration = (recipe.craftingTime || 5) * 1000; // Default to 5 seconds if not specified

    const startTime = Date.now();

    // Function to update progress
    function updateProgress() {
        const elapsed = Date.now() - startTime;
        const progressPercent = Math.min((elapsed / fabricationDuration) * 100, 100);
        progressBar.style.width = `${progressPercent}%`;

        // Logging for debugging
        console.log(`Fabricating ${recipe.name}: ${elapsed}ms elapsed, Progress: ${progressPercent.toFixed(2)}%`);

        if (elapsed >= fabricationDuration) {
            completeFabrication(recipe, button, progressBar);
        }
    }

    // Start interval to update progress every 100ms
    const intervalId = setInterval(updateProgress, 100);

    // Store fabrication state
    ongoingFabrications[recipe.name] = {
        intervalId: intervalId,
        button: button,
        progressBar: progressBar
    };

    console.log(`Started fabrication of ${recipe.name}. Duration: ${fabricationDuration}ms`);
    logMessage(`Started fabricating: ${recipe.name}`);
}

// Function to stop fabrication for a specific recipe
function stopFabrication(recipe, button, progressBar) {
    if (ongoingFabrications[recipe.name]) {
        clearInterval(ongoingFabrications[recipe.name].intervalId);
        delete ongoingFabrications[recipe.name];

        // Change button text back to "Fabricate"
        const buttonTextElement = button.querySelector('.button-text');
        if (buttonTextElement) {
            buttonTextElement.textContent = 'Fabricate';
        } else {
            console.error('Button text element not found.');
        }

        // Reset and hide progress bar
        progressBar.style.width = '0%';
        progressBar.style.display = 'none';
        logMessage(`Fabrication of ${recipe.name} has been stopped.`);

        // Optionally, refund materials when fabrication is stopped
        // Uncomment the line below to enable material refunds
        // refundMaterials(recipe.ingredients);
    }
}

// Function to complete fabrication for a specific recipe
function completeFabrication(recipe, button, progressBar) {
    if (ongoingFabrications[recipe.name]) {
        clearInterval(ongoingFabrications[recipe.name].intervalId);
        delete ongoingFabrications[recipe.name];
    }

    // Change button text back to "Fabricate"
    const buttonTextElement = button.querySelector('.button-text');
    if (buttonTextElement) {
        buttonTextElement.textContent = 'Fabricate';
    } else {
        console.error('Button text element not found.');
    }

    // Reset and hide progress bar
    progressBar.style.width = '0%';
    progressBar.style.display = 'none';

    // Create the crafted item
    const itemTemplate = items.find(i => i.name === recipe.name);
    if (itemTemplate) {
        const craftedItem = generateItemInstance(itemTemplate);
        addItemToInventory(craftedItem);
        logMessage(`You have fabricated: ${craftedItem.name}`);
        console.log(`Fabrication of ${craftedItem.name} completed.`);
    } else {
        console.error(`Item template not found for ${recipe.name}`);
        logMessage(`Fabrication completed, but item template for ${recipe.name} was not found.`);
    }

    updateInventoryDisplay();
    displayFabricationRecipes();
}

// Function to display fabrication recipes
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

// Function to create a recipe card with fabricate/stop button and embedded progress bar
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
    tooltip.innerHTML = getItemTooltipContent(itemTemplate, true); // Pass 'true' to show ranges

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

    // Fabricate Button with embedded Progress Bar
    const fabricateButton = document.createElement('button');
    fabricateButton.className = 'fabricate-button';
    fabricateButton.disabled = !hasRequiredMaterials(recipe.ingredients);

    // Create a span for the button text
    const buttonText = document.createElement('span');
    buttonText.className = 'button-text';
    buttonText.textContent = 'Fabricate';
    buttonText.style.position = 'relative';
    buttonText.style.zIndex = '1';

    // Progress Bar Inside the Button
    const progressBar = document.createElement('div');
    progressBar.className = 'button-progress-bar';
    progressBar.style.width = '0%';
    progressBar.style.height = '100%';
    progressBar.style.position = 'absolute';
    progressBar.style.top = '0';
    progressBar.style.left = '0';
    progressBar.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
    progressBar.style.transition = 'width 0.1s linear';
    progressBar.style.pointerEvents = 'none';
    progressBar.style.borderRadius = '5px';
    progressBar.style.display = 'none'; // Hidden initially

    // Append progressBar before buttonText to ensure it's behind the text
    fabricateButton.appendChild(progressBar);
    fabricateButton.appendChild(buttonText);

    // Positioning and Styling for Relative Parent
    fabricateButton.style.position = 'relative';
    fabricateButton.style.overflow = 'hidden';

    fabricateButton.addEventListener('click', () => {
        if (!ongoingFabrications[recipe.name]) {
            startFabrication(recipe, fabricateButton, progressBar);
        } else {
            stopFabrication(recipe, fabricateButton, progressBar);
        }
    });

    recipeCard.appendChild(fabricateButton);

    return recipeCard;
}

// Function to check if player has required materials
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

// Function to remove materials from inventory
function removeMaterialsFromInventory(ingredients) {
    for (let materialName in ingredients) {
        const requiredQuantity = ingredients[materialName];
        removeItemQuantityFromInventory(materialName, requiredQuantity);
    }
}

// Function to remove a specific quantity of an item from inventory
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

// Function to refund materials (optional, uncomment if needed)
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

// Optional: Format item stats for tooltip (ensure this function is correctly implemented elsewhere)
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

// Helper function to capitalize the first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
