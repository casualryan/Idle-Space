// Claim cache, temporary delve rewards, XP awards, and loot handoff.

function hasDelveClaimCacheRewards() {
    return delveClaimCache.items.length > 0 || delveClaimCache.credits > 0;
}
function getDelveClaimCacheSaleValue() {
    return delveClaimCache.items.reduce((total, item) => {
        const quantity = item?.stackable ? Math.max(1, Number(item.quantity) || 1) : 1;
        return total + (typeof getItemSalePrice === 'function' ? getItemSalePrice(item) * quantity : 0);
    }, 0);
}
function claimDelveCacheCredits() {
    if (delveClaimCache.credits <= 0) return;
    playerCurrency += delveClaimCache.credits;
    logMessage(`Claimed ${delveClaimCache.credits} credits from the Delve Claim Cache.`);
    delveClaimCache.credits = 0;
}

function claimDelveCacheItem(index) {
    const item = delveClaimCache.items[index];
    if (!item) return false;
    if (!addItemToInventory(item)) {
        if (typeof showWarningPopup === 'function') {
            showWarningPopup('Your inventory is full. Free a slot or sell the remaining cache items.');
        }
        return false;
    }
    delveClaimCache.items.splice(index, 1);
    logMessage(`Claimed ${item.quantity || 1} x ${item.name}.`);
    refreshDelveClaimCacheUI(true);
    return true;
}

function claimAllDelveCacheRewards() {
    claimDelveCacheCredits();
    const remaining = [];
    for (const item of delveClaimCache.items) {
        if (!addItemToInventory(item)) remaining.push(item);
        else logMessage(`Claimed ${item.quantity || 1} x ${item.name}.`);
    }
    delveClaimCache.items = remaining;
    if (remaining.length > 0 && typeof showWarningPopup === 'function') {
        showWarningPopup(`${remaining.length} claim-cache item${remaining.length === 1 ? '' : 's'} could not fit in your inventory.`);
    }
    refreshDelveClaimCacheUI(remaining.length > 0);
}

function sellRemainingDelveCacheRewards() {
    const saleValue = getDelveClaimCacheSaleValue();
    const itemCount = delveClaimCache.items.length;
    playerCurrency += delveClaimCache.credits + saleValue;
    const totalCredits = delveClaimCache.credits + saleValue;
    delveClaimCache = { items: [], credits: 0 };
    logMessage(`Cleared the Delve Claim Cache: ${itemCount} item${itemCount === 1 ? '' : 's'} sold or discarded for ${totalCredits} credits.`);
    refreshDelveClaimCacheUI(false);
}

function discardDelveClaimCacheForNewDelve() {
    if (!hasDelveClaimCacheRewards()) return;
    const lostItems = delveClaimCache.items.length;
    const lostCredits = delveClaimCache.credits;
    delveClaimCache = { items: [], credits: 0 };
    closeDelveClaimCachePopup();
    logMessage(`Starting a new delve destroyed ${lostItems} unclaimed item${lostItems === 1 ? '' : 's'} and ${lostCredits} unclaimed credits.`);
}
function addItemToDelveBag(itemInstance) {
    if (!itemInstance) return;

    const qty = Math.max(1, Number(itemInstance.quantity) || 1);
    itemInstance.quantity = qty;

    const isStackable = itemInstance.stackable || itemInstance.type === 'Material';
    if (isStackable) {
        if (itemInstance.type === 'Material') itemInstance.stackable = true;
        const existing = delveBag.items.find(
            item => item.name === itemInstance.name && (item.stackable === true || item.type === 'Material')
        );
        if (existing) {
            existing.quantity = (Number(existing.quantity) || 1) + qty;
            logMessage(`Item added to delve bag: ${existing.name} x${existing.quantity}`);
            return;
        }
    }

    delveBag.items.push(itemInstance);
    logMessage(`Item added to delve bag: ${itemInstance.name} x${qty}`);
}

function addMonsterLootToDelveBag(monster) {
    if (!monster) return;

    const player = window.player || {};

    if (monster.lootConfig) {
        const lootItems = generateLoot(monster, player);

        lootItems.forEach(itemInstance => {
            addItemToDelveBag(itemInstance);
        });
    }

    if (monster.currencyDrop) {
        if (Math.random() < monster.currencyDrop.dropRate) {
            const amt = getRandomInt(monster.currencyDrop.min, monster.currencyDrop.max);

            // Apply player currency modifiers if they exist
            let finalAmount = amt;
            const currencyFind = Number(player?.totalStats?.currencyFind ?? player?.stats?.currencyFind ?? 0);
            if (currencyFind) {
                finalAmount = Math.floor(amt * (1 + currencyFind / 100));
            }
            if (monster.isEmpowered) finalAmount = Math.floor(finalAmount * 1.5);

            delveBag.credits += finalAmount;
            logMessage(`Credits added to delve bag: ${finalAmount}`);
        }
    }

    // Update the delve bag UI
    updateDelveBagUI();
}

function finalizeDelveLoot() {
    console.log("finalizeDelveLoot - before setting flag - isDelveInProgress:", isDelveInProgress);
    isDelveInProgress = false;
    console.log("finalizeDelveLoot - after setting flag - isDelveInProgress:", isDelveInProgress);

    clearBuffs(player);

    logMessage("You successfully cleared the delve. Your spoils are waiting in the Delve Claim Cache.");

    delveClaimCache = {
        items: delveBag.items.slice(),
        credits: delveBag.credits
    };
    delveBag = { items: [], credits: 0 };
    updateDelveBagUI(); // Update UI when loot is finalized
    setTimeout(showDelveClaimCachePopup, 0);
}

function stopDelveWithFailure() {
    if (isDelveInProgress) {
        logMessage("Your delve fails, and you lose all items you found!");
        delveBag = { items: [], credits: 0 };
        isDelveInProgress = false;
        currentDelveLocation = null;
        currentMonsterIndex = 0;
    }
    updateDelveBagUI(); // Update UI when delve fails
}

// XP penalty helpers based on zone level vs player level
function calculateZoneXPPenaltyPercent() {
    try {
        if (!currentLocation || typeof currentLocation.recommendedLevel !== 'number') return 0;
        if (!player || typeof player.level !== 'number') return 0;
        const delta = player.level - currentLocation.recommendedLevel;
        if (delta >= 5) {
            return Math.min(100, delta * 10);
        }
        return 0;
    } catch (e) { return 0; }
}

function awardXPWithZonePenalty(baseXP, defeatedName, defeatedEnemy = null) {
    let xp = Math.floor(Number(baseXP) || 0);
    if (defeatedEnemy?.isEmpowered) xp = Math.floor(xp * 1.5);
    const penalty = calculateZoneXPPenaltyPercent();
    if (penalty > 0 && xp > 0) {
        // Apply penalty and round down per spec
        xp = Math.floor(xp * (1 - (penalty / 100)));
        if (xp < 0) xp = 0;
    }
    if (xp > 0 && typeof gainExperience === 'function') {
        gainExperience(xp);
        logMessage(`Gained ${xp} experience for defeating ${defeatedName || 'an enemy'}.`);
    } else if (xp === 0) {
        // Still notify zero gain for clarity
        logMessage(`Gained 0 experience for defeating ${defeatedName || 'an enemy'}.`);
    }
}

// Function to handle loot drops
function dropLoot(enemy) {
    // Use the new loot handler
    handleLootDrop(enemy);
}
