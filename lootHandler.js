// lootHandler.js - Handles the loot dropping logic

window.componentDropCounts = window.componentDropCounts || {};

function getCommonEnemyComponentNames() {
    return new Set(Object.values(LOOT_POOLS)
        .filter(pool => Number(pool?.tier) === 1)
        .flatMap(pool => (pool.items || []).map(entry => entry.itemName)));
}

function recordEnemyComponentDrop(item) {
    if (!item?.name || !getCommonEnemyComponentNames().has(item.name)) return;

    const quantity = Math.max(1, Number(item.quantity) || 1);
    const previous = Math.max(0, Number(window.componentDropCounts[item.name] || 0));
    const next = previous + quantity;
    window.componentDropCounts[item.name] = next;

    if (previous < 5 && next >= 5 && typeof logMessage === 'function') {
        logMessage(`${item.name} is now stocked by Marty.`);
    }
}

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
    dropChance *= Math.max(0, Number(enemy._rewardScale ?? 1));
    
    // Apply player loot luck modifier if it exists
    const lootLuck = Number(player?.totalStats?.lootLuck ?? player?.stats?.lootLuck ?? 0);
    if (lootLuck) {
        dropChance *= (1 + lootLuck / 100);
    }

    if (enemy.isEmpowered) dropChance *= 1.5;
    
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
function rollLootTier(player, allowedTierIds = null) {
    // Base probabilities defined in LOOT_TIERS
    const allowed = Array.isArray(allowedTierIds) ? new Set(allowedTierIds.map(Number)) : null;
    const tierList = Object.values(LOOT_TIERS).filter(tier => !allowed || allowed.has(tier.id));
    if (tierList.length === 0) return null;
    
    // Apply player modifiers to tier chances
    let modifiedTiers = tierList.map(tier => {
        let chance = tier.chance;
        
        // Apply player tier luck if it exists
        const tierLuck = Number(player?.totalStats?.tierLuck ?? player?.stats?.tierLuck ?? 0);
        if (tierLuck) {
            // Higher tiers get a bigger boost
            const tierBoost = (tier.id - 1) * (tierLuck / 100);
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
    
    // Floating point fallback: use the final allowed tier.
    return modifiedTiers[modifiedTiers.length - 1].id;
}

function getAvailableLootTiers(enemy) {
    const poolsByTier = enemy?.lootConfig?.poolsByTier || {};
    return Object.entries(poolsByTier)
        .filter(([, poolNames]) => Array.isArray(poolNames) && poolNames.some(poolName => {
            const pool = LOOT_POOLS[poolName];
            return Array.isArray(pool?.items) && pool.items.length > 0;
        }))
        .map(([tier]) => Number(tier))
        .filter(Number.isFinite);
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
    const extraLoot = Number(player?.totalStats?.extraLoot ?? player?.stats?.extraLoot ?? 0);
    if (extraLoot) {
        maxItems += extraLoot;
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
function selectLootEntryFromPool(poolName) {
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
            return item;
        }
    }
    
    // Fallback to the first item if something went wrong
    return pool.items[0];
}

function selectItemFromPool(poolName) {
    return selectLootEntryFromPool(poolName)?.itemName || null;
}

function getLootQuantityRange(entry, enemy) {
    if (!entry) return { min: 1, max: 1 };
    const min = Math.max(1, Math.floor(Number(entry.minQuantity) || 1));
    const max = Math.max(min, Math.floor(Number(entry.maxQuantity) || min));
    const zone = Math.min(14, Math.max(1, Math.floor(Number(enemy?.zone) || 1)));
    let multiplier = 1;
    if (entry.quantityClass === 'thematicCommon') multiplier = Math.max(1, Math.ceil(zone / 2));
    if (entry.quantityClass === 'thematicAdvanced') multiplier = Math.max(1, Math.ceil((zone - 1) / 3));
    if (entry.quantityClass === 'thematicApex' && zone >= 11) multiplier = 2;
    if (enemy?.isEmpowered) multiplier *= 1.5;
    return {
        min: Math.max(1, Math.floor(min * multiplier)),
        max: Math.max(1, Math.floor(max * multiplier))
    };
}

function rollLootQuantity(entry, enemy) {
    const range = getLootQuantityRange(entry, enemy);
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
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
    const availableTiers = getAvailableLootTiers(enemy);
    if (availableTiers.length === 0) return lootItems;
    
    // Generate each item
    for (let i = 0; i < itemCount; i++) {
        // Roll for a loot tier
        const tier = rollLootTier(player, availableTiers);
        
        // Select a loot pool based on the enemy and tier
        const poolName = selectLootPool(enemy, tier);
        if (!poolName) continue;
        
        // Select an item from the pool
        const lootEntry = selectLootEntryFromPool(poolName);
        const itemName = lootEntry?.itemName;
        if (!itemName) continue;
        
        // Find the item template
        const itemTemplate = items.find(item => item.name === itemName);
        if (!itemTemplate) {
            console.warn(`Item template not found for ${itemName}`);
            continue;
        }
        
        // Generate an instance of the item
        const itemInstance = generateItemInstance(itemTemplate);
        itemInstance.quantity = rollLootQuantity(lootEntry, enemy);
        
        // Add the generated item to the loot list
        lootItems.push(itemInstance);
        recordEnemyComponentDrop(itemInstance);
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
        const rewardScale = Math.max(0, Number(enemy._rewardScale ?? 1));
        if (Math.random() < enemy.currencyDrop.dropRate * rewardScale) {
            const currencyAmount = getRandomInt(enemy.currencyDrop.min, enemy.currencyDrop.max);

            let finalAmount = currencyAmount;
            const currencyFind = Number(player?.totalStats?.currencyFind ?? player?.stats?.currencyFind ?? 0);
            if (currencyFind) {
                finalAmount = Math.floor(currencyAmount * (1 + currencyFind / 100));
            }
            if (enemy.isEmpowered) finalAmount = Math.floor(finalAmount * 1.5);

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
        selectLootEntryFromPool,
        selectItemFromPool,
        getLootQuantityRange,
        rollLootQuantity,
        getAvailableLootTiers
    };
} else {
    // For browser environment
    // These will be globally accessible
}

window.getCommonEnemyComponentNames = getCommonEnemyComponentNames;
window.recordEnemyComponentDrop = recordEnemyComponentDrop;
