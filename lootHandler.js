// lootHandler.js - Handles the loot dropping logic

/**
 * Determines if loot should drop based on enemy and player stats
 * @param {Object} enemy - The enemy that was defeated
 * @param {Object} player - The player character
 * @return {boolean} Whether loot should drop
 */
function shouldDropLoot(enemy, player) {
    // Get the base drop chance from the enemy config
    if (!enemy.lootConfig) return false;
    
    let dropChance = enemy.lootConfig.baseDropChance || 0.5; // Default to 50% if not specified
    
    // Apply player loot luck modifier if it exists
    if (player && player.stats && player.stats.lootLuck) {
        dropChance *= (1 + player.stats.lootLuck / 100);
    }
    
    // Apply equipment modifiers that affect loot chance
    if (player && player.equipment) {
        // Example: Check all equipped items for loot modifiers
        for (const slot in player.equipment) {
            const item = player.equipment[slot];
            if (item && item.lootChanceModifier) {
                dropChance *= (1 + item.lootChanceModifier / 100);
            }
        }
    }
    
    // Cap the chance at 100%
    dropChance = Math.min(dropChance, 1.0);
    
    // Roll to see if loot drops
    return Math.random() < dropChance;
}

/**
 * Determines which tier the loot will be from
 * @param {Object} player - The player character for applying modifiers
 * @return {number} The tier ID that was selected
 */
function rollLootTier(player) {
    // Base probabilities defined in LOOT_TIERS
    const tierList = Object.values(LOOT_TIERS);
    
    // Apply player modifiers to tier chances
    let modifiedTiers = tierList.map(tier => {
        let chance = tier.chance;
        
        // Apply player tier luck if it exists
        if (player && player.stats && player.stats.tierLuck) {
            // Higher tiers get a bigger boost
            const tierBoost = (tier.id - 1) * (player.stats.tierLuck / 100);
            chance *= (1 + tierBoost);
        }
        
        return {
            id: tier.id,
            name: tier.name,
            chance: chance
        };
    });
    
    // Normalize the chances to ensure they sum to 1
    const totalChance = modifiedTiers.reduce((sum, tier) => sum + tier.chance, 0);
    modifiedTiers = modifiedTiers.map(tier => ({
        ...tier,
        chance: tier.chance / totalChance
    }));
    
    // Roll for a tier based on the probability distribution
    const roll = Math.random();
    let cumulativeChance = 0;
    
    for (const tier of modifiedTiers) {
        cumulativeChance += tier.chance;
        if (roll <= cumulativeChance) {
            return tier.id;
        }
    }
    
    // Fallback to tier 1 if something went wrong
    return 1;
}

/**
 * Determines how many items will drop
 * @param {Object} enemy - The enemy that was defeated
 * @param {Object} player - The player character
 * @return {number} The number of items to drop
 */
function rollItemCount(enemy, player) {
    if (!enemy.lootConfig) return 0;
    
    let minItems = enemy.lootConfig.minItems || 1;
    let maxItems = enemy.lootConfig.maxItems || 1;
    
    // Apply player modifiers that affect item count
    if (player && player.stats && player.stats.extraLoot) {
        maxItems += player.stats.extraLoot;
    }
    
    // Make sure minItems doesn't exceed maxItems
    minItems = Math.min(minItems, maxItems);
    
    // Roll for the number of items
    return Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;
}

/**
 * Selects a loot pool based on the enemy and tier
 * @param {Object} enemy - The enemy that was defeated
 * @param {number} tier - The tier ID that was rolled
 * @return {string|null} The selected pool name or null if none available
 */
function selectLootPool(enemy, tier) {
    if (!enemy.lootConfig || !enemy.lootConfig.poolsByTier || !enemy.lootConfig.poolsByTier[tier]) {
        return null;
    }
    
    // Get the available pools for this enemy and tier
    const availablePools = enemy.lootConfig.poolsByTier[tier];
    if (availablePools.length === 0) return null;
    
    // Select a random pool from the available ones
    const poolIndex = Math.floor(Math.random() * availablePools.length);
    return availablePools[poolIndex];
}

/**
 * Selects an item from the specified loot pool based on weights
 * @param {string} poolName - The name of the loot pool
 * @return {string|null} The selected item name or null if pool not found
 */
function selectItemFromPool(poolName) {
    const pool = LOOT_POOLS[poolName];
    if (!pool || !pool.items || pool.items.length === 0) {
        return null;
    }
    
    // Calculate the total weight
    const totalWeight = pool.items.reduce((sum, item) => sum + (item.weight || 1), 0);
    
    // Roll a random number between 0 and the total weight
    const roll = Math.random() * totalWeight;
    
    // Select an item based on weights
    let cumulativeWeight = 0;
    for (const item of pool.items) {
        cumulativeWeight += (item.weight || 1);
        if (roll <= cumulativeWeight) {
            return item.itemName;
        }
    }
    
    // Fallback to the first item if something went wrong
    return pool.items[0].itemName;
}

/**
 * Generates loot for a defeated enemy
 * @param {Object} enemy - The enemy that was defeated
 * @param {Object} player - The player character
 * @return {Array} Array of generated items
 */
function generateLoot(enemy, player) {
    const lootItems = [];
    
    // Check if loot should drop
    if (!shouldDropLoot(enemy, player)) {
        return lootItems;
    }
    
    // Determine how many items to drop
    const itemCount = rollItemCount(enemy, player);
    
    // Generate each item
    for (let i = 0; i < itemCount; i++) {
        // Roll for a loot tier
        const tier = rollLootTier(player);
        
        // Select a loot pool based on the enemy and tier
        const poolName = selectLootPool(enemy, tier);
        if (!poolName) continue;
        
        // Select an item from the pool
        const itemName = selectItemFromPool(poolName);
        if (!itemName) continue;
        
        // Find the item template
        const itemTemplate = items.find(item => item.name === itemName);
        if (!itemTemplate) {
            console.warn(`Item template not found for ${itemName}`);
            continue;
        }
        
        // Generate an instance of the item
        const itemInstance = generateItemInstance(itemTemplate);
        
        // Add the generated item to the loot list
        lootItems.push(itemInstance);
    }
    
    return lootItems;
}

/**
 * Main function to handle loot drops, replaces the old dropLoot function
 * @param {Object} enemy - The enemy that was defeated
 */
function handleLootDrop(enemy) {
    if (!enemy || enemy.name.includes('Training Dummy')) return;

    const inDelve = typeof isDelveInProgress !== 'undefined' && isDelveInProgress;

    if (inDelve) {
        addMonsterLootToDelveBag(enemy);
        return;
    }

    logMessage(`${enemy.name} is dropping loot...`);
    let lootFound = false;

    const player = window.player || {};

    const lootItems = generateLoot(enemy, player);

    lootItems.forEach(item => {
        addItemToInventory(item);

        const lootMessage = `You received: {flashing}${item.name} x${item.quantity || 1}{end}`;
        logMessage(lootMessage);
        displayLootPopup(lootMessage);
        lootFound = true;
    });

    if (enemy.currencyDrop) {
        if (Math.random() < enemy.currencyDrop.dropRate) {
            const currencyAmount = getRandomInt(enemy.currencyDrop.min, enemy.currencyDrop.max);

            let finalAmount = currencyAmount;
            if (player && player.stats && player.stats.currencyFind) {
                finalAmount = Math.floor(currencyAmount * (1 + player.stats.currencyFind / 100));
            }

            updateCurrency(finalAmount);
            logMessage(`You found {flashing}${finalAmount} currency{end}`);
            lootFound = true;
        }
    }

    updateInventoryDisplay();

    if (!lootFound) {
        logMessage(`No loot found.`);
    }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleLootDrop,
        generateLoot,
        shouldDropLoot,
        rollLootTier,
        rollItemCount,
        selectLootPool,
        selectItemFromPool
    };
} else {
    // For browser environment
    // These will be globally accessible
} 