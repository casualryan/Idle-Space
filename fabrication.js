// fabricating.js
console.log('fabricating.js loaded');
console.log('window.inventory at the start:', window.inventory);
console.log('addInventoryChangeListener at the start:', typeof addInventoryChangeListener);

const ongoingFabrications = {}; // Single active job, keyed by recipe name for save compatibility.
const FABRICATION_DURATION_MS = 5000;
const FABRICATION_TAB_ORDER = [
    'Weapons',
    'Off-Hands',
    'Chest',
    'Legs',
    'Boots',
    'Gloves',
    'Helmets',
    'Bionics',
    'Chips',
    'Materials'
];

const LEGACY_CATEGORY_FALLBACKS = {
    weapons: 'Weapons',
    shields: 'Off-Hands',
    chest: 'Chest',
    legs: 'Legs',
    boots: 'Boots',
    gloves: 'Gloves',
    helmets: 'Helmets',
    bionics: 'Bionics',
    chips: 'Chips',
    material: 'Materials',
    materials: 'Materials',
    component: 'Materials',
    components: 'Materials',
    armor: 'Chest',
    'scrap armor': 'Chest'
};

const DAMAGE_FOCUS_OPTIONS = [
    { id: 'all', label: 'All' },
    { id: 'kinetic', label: 'Kinetic' },
    { id: 'slashing', label: 'Slashing' },
    { id: 'pyro', label: 'Pyro' },
    { id: 'cryo', label: 'Cryo' },
    { id: 'electric', label: 'Electric' },
    { id: 'corrosive', label: 'Corrosive' },
    { id: 'radiation', label: 'Radiation' }
];

const DAMAGE_FOCUS_CATEGORIES = new Set(['Off-Hands']);
const missingDamageFocusWarnings = new Set();

window.registerCoreboundInitializer(() => {
    // Add the inventory change listener
    addInventoryChangeListener(() => {
        if (currentScreen === 'fabrication-screen') {
            displayFabricationRecipes();
        }
    });

    // Display the recipes on the Fabrication screen
    displayFabricationRecipes();

    const fabricationSearch = document.getElementById('fabrication-search');
    if (fabricationSearch) {
        fabricationSearch.addEventListener('input', (event) => {
            fabricationSearchQuery = (event.target.value || '').trim().toLowerCase();
            if (currentScreen === 'fabrication-screen') {
                displayCategoryRecipes(selectedCategory || FABRICATION_TAB_ORDER[0]);
            }
        });
    }
});

// Listen for screen changes to update fabrication recipes
window.addEventListener('screenChanged', (event) => {
    if (event.detail.screenId === 'fabrication-screen') {
        displayFabricationRecipes();
    }
});

// Global variable to track selected category
let selectedCategory = null;
let fabricationSearchQuery = '';
const selectedDamageFocusByCategory = {
    'Off-Hands': 'all'
};
let selectedWeaponFamily = 'all';
const selectedChassisDamageByRecipe = {};

function getRecipeItemTemplate(recipe) {
    return window.items ? window.items.find(i => i.name === recipe.name) : null;
}

function isWeaponChassisRecipe(recipe) {
    return recipe?.weaponChassis === true;
}

function getChassisDamageOptions(recipe) {
    if (!isWeaponChassisRecipe(recipe)) return [];
    return (recipe.damageOptions || []).filter(damageType => window.weaponDamageCoreDefinitions?.[damageType]);
}

function getSelectedChassisDamage(recipe, craftingOptions = null) {
    const options = getChassisDamageOptions(recipe);
    const requested = craftingOptions?.damageType || selectedChassisDamageByRecipe[recipe.name];
    if (options.includes(requested)) return requested;
    return options.includes('kinetic') ? 'kinetic' : options[0];
}

function resolveRecipeForFabrication(recipe, craftingOptions = null) {
    if (!isWeaponChassisRecipe(recipe)) return recipe;
    const damageType = getSelectedChassisDamage(recipe, craftingOptions);
    const ingredients = recipe.ingredientsByDamage?.[damageType];
    if (!damageType || !ingredients) {
        throw new TypeError(`Weapon chassis recipe ${recipe.name} has no valid damage-core ingredients.`);
    }
    return {
        ...recipe,
        ingredients: { ...ingredients },
        craftingOptions: { damageType }
    };
}

function getRecipePreviewTemplate(recipe, itemTemplate, craftingOptions = null) {
    if (!itemTemplate || !isWeaponChassisRecipe(recipe)) return itemTemplate;
    const damageType = getSelectedChassisDamage(recipe, craftingOptions);
    return window.resolveWeaponChassisTemplate(itemTemplate, damageType, () => 0);
}

function getFabricationOutputLabel(recipe) {
    if (!isWeaponChassisRecipe(recipe)) return recipe.name;
    const damageType = getSelectedChassisDamage(recipe, recipe.craftingOptions);
    const core = window.weaponDamageCoreDefinitions?.[damageType];
    return `${recipe.name} · ${core?.label || damageType} Core`;
}

function findRestorableRecipe(recipeName) {
    return window.recipes?.find(candidate => candidate.name === recipeName)
        || window.retiredRecipes?.find(candidate => candidate.name === recipeName)
        || null;
}

function normalizeType(value) {
    return (value || '').toString().trim().toLowerCase();
}

function normalizeDamageFocus(value) {
    const normalized = (value || '').toString().trim().toLowerCase();
    const canonical = normalized === 'chemical' ? 'corrosive' : normalized;
    const allowed = new Set(['kinetic', 'slashing', 'pyro', 'cryo', 'electric', 'corrosive', 'radiation']);
    return allowed.has(canonical) ? canonical : null;
}

function getRecipeLevel(recipe) {
    const itemTemplate = getRecipeItemTemplate(recipe);
    if (!itemTemplate || itemTemplate.levelRequirement == null) return Number.MAX_SAFE_INTEGER;

    const requirement = itemTemplate.levelRequirement;
    if (typeof requirement === 'number') return requirement;
    if (typeof requirement === 'object') {
        if (typeof requirement.min === 'number') return requirement.min;
        if (typeof requirement.max === 'number') return requirement.max;
    }
    return Number.MAX_SAFE_INTEGER;
}

function getRecipeCategory(recipe) {
    const itemTemplate = getRecipeItemTemplate(recipe);
    if (itemTemplate) {
        switch (itemTemplate.slot) {
            case 'mainHand':
                return 'Weapons';
            case 'offHand':
                return 'Off-Hands';
            case 'chest':
                return 'Chest';
            case 'legs':
                return 'Legs';
            case 'feet':
                return 'Boots';
            case 'gloves':
                return 'Gloves';
            case 'head':
                return 'Helmets';
            case 'bionic':
                return 'Bionics';
            case 'chip':
                return 'Chips';
            default:
                break;
        }

        const normalizedType = normalizeType(itemTemplate.type);
        if (normalizedType === 'bionic') return 'Bionics';
        if (normalizedType === 'chip') return 'Chips';
        if (normalizedType === 'material' || normalizedType === 'component') return 'Materials';
    }

    const legacyCategory = normalizeType(recipe.category);
    return LEGACY_CATEGORY_FALLBACKS[legacyCategory] || null;
}

function getCategoryRecipes() {
    const grouped = {};
    FABRICATION_TAB_ORDER.forEach(tab => {
        grouped[tab] = [];
    });

    if (!window.recipes) return grouped;

    window.recipes.forEach(recipe => {
        if (recipe.retired) return;
        const category = getRecipeCategory(recipe);
        if (!category || !grouped[category]) return;
        grouped[category].push(recipe);
    });

    return grouped;
}

function getRecipeDisplayType(itemTemplate) {
    if (!itemTemplate) return 'Item';

    switch (itemTemplate.slot) {
        case 'mainHand':
            return 'Main-Hand Weapon';
        case 'offHand':
            return 'Off-Hand';
        case 'chest':
            return 'Chest Armor';
        case 'legs':
            return 'Leg Armor';
        case 'feet':
            return 'Boots';
        case 'gloves':
            return 'Gloves';
        case 'head':
            return 'Helmet';
        case 'bionic':
            return 'Bionic';
        case 'chip':
            return 'Chip';
        default:
            break;
    }

    const normalizedType = normalizeType(itemTemplate.type);
    if (normalizedType === 'material' || normalizedType === 'component') return 'Material';
    if (normalizedType === 'shield') return 'Off-Hand';

    return itemTemplate.type || 'Item';
}

function getRecipeSubtitle(recipe, itemTemplate) {
    if (isWeaponChassisRecipe(recipe)) {
        const definition = window.weaponChassisDefinitions?.[recipe.name];
        const level = getRecipeLevel(recipe);
        return `${definition?.familyLabel || 'Weapon'} Chassis · Level ${level}`;
    }
    const displayType = getRecipeDisplayType(itemTemplate);
    const level = getRecipeLevel(recipe);
    if (Number.isFinite(level) && level !== Number.MAX_SAFE_INTEGER) {
        return `${displayType} · Level ${level}`;
    }
    return displayType;
}

function getRecipeModifierPreview(recipe, itemTemplate) {
    if (!itemTemplate || typeof window.getRandomModifierPreviewInfo !== 'function') {
        return null;
    }
    const preview = window.getRandomModifierPreviewInfo(itemTemplate);
    if (!preview) return null;
    return {
        countRange: preview.countRange,
        maxGradeLabel: preview.maxGradeLabel || `Grade ${preview.maxGrade || 1}`
    };
}

function getMaterialAcquisitionHint(itemName) {
    const acquisition = window.MATERIAL_ACQUISITION?.[itemName];
    if (!acquisition) return 'Source not documented';
    return `Available around level ${acquisition.level}: ${acquisition.source}`;
}

function isDamageFocusCategory(category) {
    return DAMAGE_FOCUS_CATEGORIES.has(category);
}

function getRecipeDamageFocus(recipe, category) {
    const normalizedFocus = normalizeDamageFocus(recipe.damageFocus);
    if (normalizedFocus) return normalizedFocus;

    if (isDamageFocusCategory(category)) {
        const warningKey = `${category}:${recipe.name}`;
        if (!missingDamageFocusWarnings.has(warningKey)) {
            missingDamageFocusWarnings.add(warningKey);
            console.warn(`Recipe missing valid damageFocus (${category}): ${recipe.name}`);
        }
    }
    return null;
}

function renderDamageFocusControls(container, category) {
    if (!isDamageFocusCategory(category)) return;

    const selectedFocus = selectedDamageFocusByCategory[category] || 'all';
    const subcategoryRow = document.createElement('div');
    subcategoryRow.className = 'fabrication-subcategories';

    DAMAGE_FOCUS_OPTIONS.forEach(option => {
        const button = document.createElement('button');
        button.className = `fab-subcategory-tab ${selectedFocus === option.id ? 'active' : ''}`;
        button.textContent = option.label;
        button.addEventListener('click', () => {
            selectedDamageFocusByCategory[category] = option.id;
            refreshFabricationSubcategoryControls(container, category);
            displayCategoryRecipes(category);
        });
        subcategoryRow.appendChild(button);
    });

    container.appendChild(subcategoryRow);
}

function renderWeaponFamilyControls(container, category) {
    if (category !== 'Weapons') return;
    const options = [
        { id: 'all', label: 'All Families' },
        ...Object.entries(window.coreboundWeaponTaxonomy?.families || {}).map(([id, definition]) => ({
            id,
            label: definition.label
        }))
    ];
    const subcategoryRow = document.createElement('div');
    subcategoryRow.className = 'fabrication-subcategories';
    options.forEach(option => {
        const button = document.createElement('button');
        button.className = `fab-subcategory-tab ${selectedWeaponFamily === option.id ? 'active' : ''}`;
        button.textContent = option.label;
        button.addEventListener('click', () => {
            selectedWeaponFamily = option.id;
            refreshFabricationSubcategoryControls(container, category);
            displayCategoryRecipes(category);
        });
        subcategoryRow.appendChild(button);
    });
    container.appendChild(subcategoryRow);
}

function refreshFabricationSubcategoryControls(container, category) {
    container.querySelectorAll('.fabrication-subcategories').forEach(node => node.remove());
    if (category === 'Weapons') renderWeaponFamilyControls(container, category);
    else renderDamageFocusControls(container, category);
}

function getFabricationDurationMs(recipe) {
    return FABRICATION_DURATION_MS;
}

function scheduleFabrication(recipe, remainingMs = FABRICATION_DURATION_MS) {
    const durationMs = FABRICATION_DURATION_MS;
    const safeRemaining = Math.max(0, Math.min(durationMs, Number(remainingMs) || durationMs));
    ongoingFabrications[recipe.name] = {
        recipe,
        startTime: Date.now() - (durationMs - safeRemaining),
        durationMs,
        intervalId: null
    };

    ongoingFabrications[recipe.name].intervalId = setInterval(() => {
        if (!ongoingFabrications[recipe.name]) return;
        const { percent } = getFabricationProgress(recipe.name);
        syncAllFabricationUI();
        if (percent >= 100) completeFabrication(recipe);
    }, 100);
}

function getFabricationState() {
    return Object.values(ongoingFabrications).map(fabrication => ({
        recipeName: fabrication.recipe.name,
        remainingMs: Math.max(0, fabrication.durationMs - (Date.now() - fabrication.startTime)),
        craftingOptions: fabrication.recipe.craftingOptions
            ? { ...fabrication.recipe.craftingOptions }
            : undefined,
        feedCostPaid: fabrication.recipe.feedCostPaid === true
    }));
}

function clearFabricationsOnLoad() {
    Object.values(ongoingFabrications).forEach(fabrication => clearInterval(fabrication.intervalId));
    Object.keys(ongoingFabrications).forEach(name => delete ongoingFabrications[name]);
}

function restoreFabricationState(savedFabrications) {
    clearFabricationsOnLoad();
    if (!Array.isArray(savedFabrications)) return;
    const [activeJob, ...legacyExtraJobs] = savedFabrications;
    if (activeJob) {
        const recipe = findRestorableRecipe(activeJob.recipeName);
        if (recipe) scheduleFabrication({
            ...resolveRecipeForFabrication(recipe, activeJob.craftingOptions),
            feedCostPaid: activeJob.feedCostPaid === true
        }, activeJob.remainingMs);
    }
    legacyExtraJobs.forEach(saved => {
        const recipe = findRestorableRecipe(saved.recipeName);
        if (recipe) {
            const resolved = resolveRecipeForFabrication(recipe, saved.craftingOptions);
            refundMaterials(resolved.ingredients);
            if (saved.feedCostPaid === true) playerFeed += Math.max(0, Number(resolved.feedCost) || 0);
        }
    });
    if (legacyExtraJobs.length > 0) {
        logMessage('Older concurrent fabrication jobs were cancelled and their materials refunded.');
    }
    renderFabricationActivePanel();
    syncAllFabricationUI();
}

window.getFabricationState = getFabricationState;
window.clearFabricationsOnLoad = clearFabricationsOnLoad;
window.restoreFabricationState = restoreFabricationState;

function getFabricationProgress(recipeName) {
    const fabrication = ongoingFabrications[recipeName];
    if (!fabrication) {
        return { percent: 0, remainingSec: 0 };
    }

    const elapsed = Date.now() - fabrication.startTime;
    const percent = Math.min((elapsed / fabrication.durationMs) * 100, 100);
    const remainingSec = Math.max(0, (fabrication.durationMs - elapsed) / 1000);
    return { percent, remainingSec };
}

function getRecipeCardElement(recipeName) {
    const cards = document.querySelectorAll('.recipe-card[data-recipe-name]');
    for (const card of cards) {
        if (card.dataset.recipeName === recipeName) {
            return card;
        }
    }
    return null;
}

function updateFabricationCardUI(recipeName) {
    const fabrication = ongoingFabrications[recipeName];
    const card = getRecipeCardElement(recipeName);
    if (!fabrication || !card) return;

    const buttonContainer = card.querySelector('.fab-button-container');
    const button = card.querySelector('.fab-button');
    const progressBar = card.querySelector('.fab-progress-bar');
    if (!buttonContainer || !button || !progressBar) return;

    const { percent } = getFabricationProgress(recipeName);
    buttonContainer.classList.add('fabricating');
    card.classList.add('recipe-card-fabricating');
    button.textContent = 'Cancel Fabrication';
    button.disabled = false;
    progressBar.style.width = `${percent}%`;
}

function updateFabricationActivePanelProgress() {
    const list = document.getElementById('fabrication-active-list');
    if (!list) return;

    list.querySelectorAll('.fabrication-active-entry').forEach(entry => {
        const recipeName = entry.dataset.recipeName;
        const fabrication = ongoingFabrications[recipeName];
        if (!fabrication) return;

        const { percent, remainingSec } = getFabricationProgress(recipeName);
        const meta = entry.querySelector('.fabrication-active-meta');
        const progressBar = entry.querySelector('.fab-active-progress-bar');
        if (meta) meta.textContent = `${remainingSec.toFixed(1)}s remaining`;
        if (progressBar) progressBar.style.width = `${percent}%`;
    });
}

function syncAllFabricationUI() {
    Object.keys(ongoingFabrications).forEach(updateFabricationCardUI);
    updateFabricationActivePanelProgress();
}

function renderFabricationActivePanel() {
    const panel = document.getElementById('fabrication-active-panel');
    const list = document.getElementById('fabrication-active-list');
    if (!panel || !list) return;

    const activeNames = Object.keys(ongoingFabrications);
    if (activeNames.length === 0) {
        panel.style.display = 'none';
        list.innerHTML = '';
        return;
    }

    panel.style.display = 'block';
    list.innerHTML = '';

    activeNames.forEach(recipeName => {
        const fabrication = ongoingFabrications[recipeName];
        const { percent, remainingSec } = getFabricationProgress(recipeName);

        const entry = document.createElement('div');
        entry.className = 'fabrication-active-entry';
        entry.dataset.recipeName = recipeName;
        entry.innerHTML = `
            <div class="fabrication-active-entry-header">
                <div class="fabrication-active-name">${getFabricationOutputLabel(fabrication.recipe)}</div>
                <div class="fabrication-active-meta">${remainingSec.toFixed(1)}s remaining</div>
            </div>
            <div class="progress-container fabrication-active-progress">
                <div class="progress-bar gathering-bar fab-active-progress-bar" style="width: ${percent}%"></div>
            </div>
            <button class="fab-cancel-active-btn" type="button">Cancel</button>
        `;

        entry.querySelector('.fab-cancel-active-btn').addEventListener('click', () => {
            stopFabrication(fabrication.recipe);
            if (window.playSound) playSound('UI_BACK');
        });

        list.appendChild(entry);
    });
}

function startFabrication(recipe) {
    if (ongoingFabrications[recipe.name]) {
        logMessage(`Already fabricating ${recipe.name}.`);
        return;
    }

    if (Object.keys(ongoingFabrications).length > 0) {
        logMessage('The fabricator can run exactly one job at a time. Cancel or finish the active job first.');
        return;
    }

    const fabricationRecipe = resolveRecipeForFabrication(recipe);

    if (!hasRequiredMaterials(fabricationRecipe.ingredients)) {
        logMessage('You do not have the required materials to fabricate this item.');
        return;
    }
    if (playerFeed < fabricationRecipe.feedCost) {
        logMessage(`Requires ${fabricationRecipe.feedCost} Feed to fabricate ${recipe.name}.`);
        return;
    }

    const outputTemplate = getRecipeItemTemplate(recipe);
    if (!isMaterialItem(outputTemplate) && !hasInventorySpace(1)) {
        if (typeof showWarningPopup === 'function') {
            showWarningPopup('Your inventory is full. Free up space before starting fabrication.');
        } else {
            logMessage('Your inventory is full. Free up space before starting fabrication.');
        }
        return;
    }

    removeMaterialsFromInventory(fabricationRecipe.ingredients);
    playerFeed -= fabricationRecipe.feedCost;
    updateInventoryDisplay();
    scheduleFabrication({ ...fabricationRecipe, feedCostPaid: true });

    renderFabricationActivePanel();
    displayFabricationRecipes();
    logMessage(`Started fabricating: ${getFabricationOutputLabel(fabricationRecipe)}`);
}

function stopFabrication(recipe) {
    const fabrication = ongoingFabrications[recipe.name];
    if (!fabrication) return;

    clearInterval(fabrication.intervalId);
    delete ongoingFabrications[recipe.name];

    refundMaterials(fabrication.recipe.ingredients);
    if (fabrication.recipe.feedCostPaid === true) updateFeed(Math.max(0, Number(fabrication.recipe.feedCost) || 0));

    renderFabricationActivePanel();
    syncAllFabricationUI();
    displayFabricationRecipes();

    logMessage(`Fabrication of ${getFabricationOutputLabel(fabrication.recipe)} has been stopped. Reserved resources refunded.`);
}

function completeFabrication(recipe) {
    const fabrication = ongoingFabrications[recipe.name];
    if (!fabrication) return;

    clearInterval(fabrication.intervalId);
    delete ongoingFabrications[recipe.name];

    const completedRecipe = fabrication.recipe;
    const itemTemplate = window.items ? window.items.find(i => i.name === completedRecipe.name) : null;
    if (itemTemplate) {
        try {
            const outputTemplate = isWeaponChassisRecipe(completedRecipe)
                ? window.resolveWeaponChassisTemplate(
                    itemTemplate,
                    getSelectedChassisDamage(completedRecipe, completedRecipe.craftingOptions)
                )
                : itemTemplate;
            const craftedItem = generateItemInstance(outputTemplate);

            if (!isMaterialItem(craftedItem) && !hasInventorySpace(1)) {
                if (typeof showWarningPopup === 'function') {
                    showWarningPopup('Your inventory is full. Crafted item cannot be added. Materials have been refunded.');
                }
                refundMaterials(completedRecipe.ingredients);
                if (completedRecipe.feedCostPaid === true) playerFeed += Math.max(0, Number(completedRecipe.feedCost) || 0);
            } else {
                addItemToInventory(craftedItem);
                logMessage(`You have fabricated: ${craftedItem.name}`);
            }

            if (window.playSound) {
                playSound('ITEM_PICKUP', 0.4);
            }
        } catch (error) {
            console.error('Error generating item:', error);
            logMessage(`Error fabricating ${completedRecipe.name}. Please try again.`);
            refundMaterials(completedRecipe.ingredients);
            if (completedRecipe.feedCostPaid === true) playerFeed += Math.max(0, Number(completedRecipe.feedCost) || 0);
        }
    } else {
        console.error(`Item template not found for ${completedRecipe.name}`);
        logMessage(`Fabrication completed, but item template for ${completedRecipe.name} was not found.`);
        refundMaterials(completedRecipe.ingredients);
        if (completedRecipe.feedCostPaid === true) playerFeed += Math.max(0, Number(completedRecipe.feedCost) || 0);
    }

    renderFabricationActivePanel();
    updateInventoryDisplay();
    displayFabricationRecipes();
}




// Function to display fabrication recipes
function displayFabricationRecipes() {
    const fabricationCategories = document.getElementById('fabrication-categories');
    if (!fabricationCategories) {
        console.error("fabrication-categories div not found");
        return;
    }
    
    fabricationCategories.innerHTML = '';
    
    const categories = getCategoryRecipes();

    if (!window.recipes) {
        console.error("Recipes not found: window.recipes is undefined");
    }
    
    // Create category tabs
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'fabrication-tabs';
    
    // Keep selected category in the defined tab set
    if (!selectedCategory || !FABRICATION_TAB_ORDER.includes(selectedCategory)) {
        selectedCategory = FABRICATION_TAB_ORDER[0];
    }
    
    // Create tabs in fixed player-facing order
    FABRICATION_TAB_ORDER.forEach(category => {
        const recipeCount = (categories[category] || []).length;
        const tab = document.createElement('button');
        tab.className = `fab-category-tab ${category === selectedCategory ? 'active' : ''}`;
        tab.textContent = category;
        tab.title = `${recipeCount} recipes`;
        tab.addEventListener('click', () => {
            // Update selected tab
            document.querySelectorAll('.fab-category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update selected category and refresh display
            selectedCategory = category;
            refreshFabricationSubcategoryControls(fabricationCategories, category);
            displayCategoryRecipes(category);
            
            // Play select sound if available
            if (window.playSound) {
                playSound('UI_SELECT');
            }
        });
        tabsContainer.appendChild(tab);
    });
    
    fabricationCategories.appendChild(tabsContainer);
    refreshFabricationSubcategoryControls(fabricationCategories, selectedCategory);
    
    // Display recipes for currently selected category
    displayCategoryRecipes(selectedCategory);
}

// Function to display recipes for a specific category
function displayCategoryRecipes(category) {
    const recipeContainer = document.getElementById('recipe-container');
    recipeContainer.innerHTML = '';
    
    const categories = getCategoryRecipes();
    let categoryRecipes = (categories[category] || []).slice();

    if (fabricationSearchQuery) {
        categoryRecipes = categoryRecipes.filter(recipe =>
            recipe.name.toLowerCase().includes(fabricationSearchQuery)
        );
    }

    if (isDamageFocusCategory(category)) {
        const selectedFocus = selectedDamageFocusByCategory[category] || 'all';
        if (selectedFocus !== 'all') {
            categoryRecipes = categoryRecipes.filter(recipe => getRecipeDamageFocus(recipe, category) === selectedFocus);
        }
    }

    if (category === 'Weapons' && selectedWeaponFamily !== 'all') {
        categoryRecipes = categoryRecipes.filter(recipe =>
            (recipe.weaponFamily || getRecipeItemTemplate(recipe)?.weaponFamily) === selectedWeaponFamily
        );
    }

    categoryRecipes.sort((a, b) => {
        const levelDiff = getRecipeLevel(a) - getRecipeLevel(b);
        if (levelDiff !== 0) return levelDiff;
        return a.name.localeCompare(b.name);
    });
    
    console.log(`Displaying ${categoryRecipes.length} recipes for category: ${category}`);
    
    if (categoryRecipes.length === 0) {
        recipeContainer.innerHTML = '<div class="no-recipes">No recipes available in this category.</div>';
        renderFabricationActivePanel();
        syncAllFabricationUI();
        return;
    }
    
    categoryRecipes.forEach(recipe => {
        const recipeCard = createRecipeCard(recipe);
        recipeContainer.appendChild(recipeCard);
    });

    renderFabricationActivePanel();
    syncAllFabricationUI();
}

// Function to create a recipe card
function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.dataset.recipeName = recipe.name;
    const itemTemplate = getRecipeItemTemplate(recipe);
    const inProgress = !!ongoingFabrications[recipe.name];
    const selectedRecipe = inProgress
        ? ongoingFabrications[recipe.name].recipe
        : resolveRecipeForFabrication(recipe);
    const previewTemplate = getRecipePreviewTemplate(recipe, itemTemplate, selectedRecipe.craftingOptions);
    const fabricatorBusy = !inProgress && Object.keys(ongoingFabrications).length > 0;
    const requiredLevel = getRecipeLevel(recipe);
    const levelLocked = Number.isFinite(requiredLevel) && requiredLevel !== Number.MAX_SAFE_INTEGER && player.level < requiredLevel;
    
    // Card header
    const header = document.createElement('div');
    header.className = 'recipe-header';
    header.innerHTML = `
        <div class="recipe-name">${recipe.name}</div>
        <div class="recipe-type">${getRecipeSubtitle(recipe, previewTemplate)}</div>
    `;
    card.appendChild(header);
    if (levelLocked) {
        const warning = document.createElement('div');
        warning.className = 'recipe-level-warning';
        warning.style.color = '#ff6464';
        warning.textContent = `Requires level ${requiredLevel} to equip. You may still fabricate it.`;
        card.appendChild(warning);
    }
    
    // Card body
    const body = document.createElement('div');
    body.className = 'recipe-body';
    
    // Description if available
    if (recipe.description) {
        const description = document.createElement('div');
        description.className = 'recipe-description';
        description.textContent = recipe.description;
        body.appendChild(description);
    }

    if (isWeaponChassisRecipe(recipe)) {
        const selectorPanel = document.createElement('label');
        selectorPanel.className = 'chassis-core-selector';
        const selectorTitle = document.createElement('span');
        selectorTitle.textContent = 'Damage Core';
        const selector = document.createElement('select');
        const selectedDamage = getSelectedChassisDamage(recipe, selectedRecipe.craftingOptions);
        getChassisDamageOptions(recipe).forEach(damageType => {
            const core = window.weaponDamageCoreDefinitions[damageType];
            const option = document.createElement('option');
            option.value = damageType;
            option.textContent = `${core.label} — ${core.coreLabel}`;
            option.selected = damageType === selectedDamage;
            selector.appendChild(option);
        });
        selector.disabled = inProgress;
        selector.addEventListener('click', event => event.stopPropagation());
        selector.addEventListener('change', event => {
            selectedChassisDamageByRecipe[recipe.name] = event.target.value;
            displayCategoryRecipes('Weapons');
        });
        selectorPanel.appendChild(selectorTitle);
        selectorPanel.appendChild(selector);
        body.appendChild(selectorPanel);
    }

    const modifierPreview = getRecipeModifierPreview(recipe, previewTemplate);
    if (modifierPreview) {
        const previewNote = document.createElement('div');
        previewNote.className = 'recipe-modifier-preview';
        previewNote.innerHTML = `
            <div><strong>Random Modifiers:</strong> ${modifierPreview.countRange}</div>
            <div><strong>Max Grade:</strong> ${modifierPreview.maxGradeLabel}</div>
            <div class="recipe-modifier-preview-sub">Preview shows base stats only.</div>
        `;
        body.appendChild(previewNote);
    }
    
    // Ingredients section
    const ingredients = document.createElement('div');
    ingredients.className = 'recipe-ingredients';
    ingredients.innerHTML = `<div class="recipe-ingredients-title">Required Resources:</div>`;
    
    const ingredientsList = document.createElement('ul');
    ingredientsList.className = 'ingredients-list';
    
    // Handle ingredients as an object (not an array)
    for (const itemName in selectedRecipe.ingredients) {
        const quantity = selectedRecipe.ingredients[itemName];
        const hasIngredient = hasRequiredMaterial(itemName, quantity);
        
        const li = document.createElement('li');
        li.className = `ingredient-item ${hasIngredient ? '' : 'missing'}`;
        li.innerHTML = `
            <span class="ingredient-copy">
                <span>${itemName} × ${quantity}</span>
                <small class="ingredient-source">${getMaterialAcquisitionHint(itemName)}</small>
            </span>
            <span>${hasIngredient ? '✓' : '✗'}</span>
        `;
        ingredientsList.appendChild(li);
    }
    
    ingredients.appendChild(ingredientsList);
    const feedLine = document.createElement('div');
    feedLine.className = `recipe-feed-cost ${playerFeed >= selectedRecipe.feedCost ? '' : 'missing'}`;
    feedLine.innerHTML = `<span>Feed × ${selectedRecipe.feedCost.toLocaleString()}</span><span>${playerFeed >= selectedRecipe.feedCost ? '✓' : '✗'}</span>`;
    ingredients.appendChild(feedLine);
    body.appendChild(ingredients);
    
    // Crafting time
    const craftingTime = document.createElement('div');
    craftingTime.className = 'recipe-time';
    craftingTime.textContent = 'Crafting Time: 5 seconds';
    body.appendChild(craftingTime);
    
    // Add fabricate button with progress bar
    const buttonContainer = document.createElement('div');
    buttonContainer.className = `fab-button-container${inProgress ? ' fabricating' : ''}`;

    const progressBg = document.createElement('div');
    progressBg.className = 'fab-progress-bg';
    progressBg.dataset.recipeName = recipe.name;
    const progressBar = document.createElement('div');
    progressBar.className = 'fab-progress-bar';
    if (inProgress) {
        progressBar.style.width = `${getFabricationProgress(recipe.name).percent}%`;
    }
    progressBg.appendChild(progressBar);
    buttonContainer.appendChild(progressBg);

    const button = document.createElement('button');
    button.className = 'fab-button';
    button.textContent = inProgress ? 'Cancel Fabrication' : (fabricatorBusy ? 'Fabricator Busy' : 'Fabricate');

    const canCraft = hasRequiredMaterials(selectedRecipe.ingredients) && playerFeed >= selectedRecipe.feedCost;
    button.disabled = inProgress ? false : (!canCraft || fabricatorBusy);

    if (inProgress) {
        card.classList.add('recipe-card-fabricating');
    }

    button.addEventListener('click', () => {
        if (ongoingFabrications[recipe.name]) {
            stopFabrication(recipe);
            if (window.playSound) playSound('UI_BACK');
        } else {
            startFabrication(recipe);
            if (window.playSound) playSound('UI_SELECT');
        }
    });
    
    buttonContainer.appendChild(button);
    body.appendChild(buttonContainer);
    card.appendChild(body);
    
    // Add data for tooltip if needed
    if (previewTemplate) {
        // Add tooltip data (ranges for shop/fabricator previews)
        card.setAttribute('data-has-tooltip', 'true');
        card.setAttribute('data-tooltip-content', getItemTooltipContent(previewTemplate, true));
        // Make the card look interactive
        card.style.cursor = 'pointer';
    }
    
    return card;
}

// Helper function to check if the player has a specific material
function hasRequiredMaterial(itemName, quantity) {
    return getMaterialQuantity(itemName) >= quantity;
}

// Function to check if player has required materials
function hasRequiredMaterials(ingredients) {
    for (let materialName in ingredients) {
        const requiredQuantity = ingredients[materialName];
        const playerQuantity = getMaterialQuantity(materialName);
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
    if (!removeMaterialFromStorage(itemName, quantity)) {
        console.warn(`Attempted to remove ${quantity} ${itemName}, but material storage contains ${getMaterialQuantity(itemName)}.`);
    }
    updateInventoryDisplay();
    notifyInventoryChange();
}

// Function to refund materials
function refundMaterials(ingredients) {
    console.log("Refunding materials:", ingredients);
    
    for (let materialName in ingredients) {
        const quantity = ingredients[materialName];
        const materialTemplate = window.items.find(i => i.name === materialName);
        
        if (materialTemplate) {
            console.log(`Refunding ${quantity}x ${materialName}`);
            
            try {
                const materialItem = generateItemInstance(materialTemplate);
                materialItem.quantity = quantity;
                addItemToInventory(materialItem);
            } catch (error) {
                console.error(`Error refunding ${materialName}:`, error);
                logMessage(`Error refunding ${materialName}.`);
            }
        } else {
            console.warn(`Material template not found: ${materialName}`);
        }
    }
    
    updateInventoryDisplay();
    logMessage("Materials have been refunded.");
}

// Helper function to capitalize the first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
