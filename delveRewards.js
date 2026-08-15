// Claim cache, temporary delve rewards, XP awards, and loot handoff.

function hasDelveClaimCacheRewards() {
    return delveClaimCache.items.length > 0 || delveClaimCache.feed > 0;
}

function getInventorySlotsRequiredForItems(items = []) {
    const existingStackNames = new Set((window.inventory || [])
        .filter(item => item && item.type !== 'Chip' && item.stackable === true && !isMaterialItem(item))
        .map(item => item.name));
    let requiredSlots = 0;

    for (const item of items) {
        if (!item || isMaterialItem(item) || item.type === 'Core' || item.type === 'Cache') continue;
        if (item.type === 'Chip') {
            requiredSlots += Math.max(1, Math.floor(Number(item.quantity) || 1));
        } else if (item.stackable === true) {
            if (!existingStackNames.has(item.name)) {
                existingStackNames.add(item.name);
                requiredSlots++;
            }
        } else {
            requiredSlots++;
        }
    }

    return requiredSlots;
}

function canClaimAllItemsToInventory(items = []) {
    return getUsedInventorySlots() + getInventorySlotsRequiredForItems(items) <= player.maxInventorySlots;
}
function getDelveClaimCacheSaleValue() {
    return delveClaimCache.items.reduce((total, item) => {
        const quantity = item?.stackable ? Math.max(1, Number(item.quantity) || 1) : 1;
        return total + (typeof getItemSalePrice === 'function' ? getItemSalePrice(item) * quantity : 0);
    }, 0);
}
function claimDelveCacheFeed() {
    if (delveClaimCache.feed <= 0) return;
    playerFeed += delveClaimCache.feed;
    logMessage(`Claimed ${delveClaimCache.feed} Feed from the Operation Claim Cache.`);
    delveClaimCache.feed = 0;
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
    claimDelveCacheFeed();
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
    playerFeed += delveClaimCache.feed + saleValue;
    const totalFeed = delveClaimCache.feed + saleValue;
    delveClaimCache = { items: [], feed: 0 };
    logMessage(`Cleared the Operation Claim Cache: ${itemCount} item${itemCount === 1 ? '' : 's'} sold or discarded for ${totalFeed} Feed.`);
    refreshDelveClaimCacheUI(false);
}

function discardDelveClaimCacheForNewDelve() {
    if (!hasDelveClaimCacheRewards()) return;
    const lostItems = delveClaimCache.items.length;
    const lostFeed = delveClaimCache.feed;
    delveClaimCache = { items: [], feed: 0 };
    closeDelveClaimCachePopup();
    logMessage(`Starting a new Operation destroyed ${lostItems} unclaimed item${lostItems === 1 ? '' : 's'} and ${lostFeed} unclaimed Feed.`);
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

    if (typeof rollEnemySpecialDrops === 'function') {
        rollEnemySpecialDrops(monster).forEach(addItemToDelveBag);
    }

    if (monster.currencyDrop) {
        const rewardScale = Math.max(0, Number(monster._rewardScale ?? 1));
        if (Math.random() < monster.currencyDrop.dropRate * rewardScale) {
            const amt = getRandomInt(monster.currencyDrop.min, monster.currencyDrop.max);

            // Apply player currency modifiers if they exist
            let finalAmount = amt;
            const currencyFind = Number(player?.totalStats?.currencyFind ?? player?.stats?.currencyFind ?? 0);
            if (currencyFind) {
                finalAmount = Math.floor(amt * (1 + currencyFind / 100));
            }
            if (monster.isEmpowered) finalAmount = Math.floor(finalAmount * 1.5);

            delveBag.feed += finalAmount;
            logMessage(`Feed added to Operation Bag: ${finalAmount}`);
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

    const operationName = typeof currentDelveLocation !== 'undefined' && currentDelveLocation?.name
        ? currentDelveLocation.name
        : 'Operation';
    const completedItems = delveBag.items.slice();
    const completedFeed = Math.max(0, Number(delveBag.feed) || 0);
    const rewardSummary = completedItems.map(item => ({
        ...item,
        kind: String(item?.type || 'item').toLowerCase(),
        quantity: Math.max(1, Number(item?.quantity) || 1)
    }));
    if (completedFeed > 0) rewardSummary.push({ kind: 'feed', name: 'Feed', quantity: completedFeed });
    const ordinaryItems = [];
    const remainingItems = [];
    let storedResourceUnits = 0;

    for (const item of completedItems) {
        const isDedicatedResource = isMaterialItem(item) || item?.type === 'Core' || item?.type === 'Cache';
        if (!isDedicatedResource) {
            ordinaryItems.push(item);
            continue;
        }
        if (addItemToInventory(item)) {
            storedResourceUnits += Math.max(1, Number(item.quantity) || 1);
        } else {
            remainingItems.push(item);
        }
    }

    if (completedFeed > 0) {
        playerFeed += completedFeed;
        logMessage(`Automatically claimed ${completedFeed} Operation Feed.`);
    }
    if (storedResourceUnits > 0) {
        logMessage(`Automatically stored ${storedResourceUnits} Operation resource${storedResourceUnits === 1 ? '' : 's'}.`);
    }

    let inventoryWasFull = false;
    if (ordinaryItems.length > 0) {
        if (canClaimAllItemsToInventory(ordinaryItems)) {
            for (const item of ordinaryItems) {
                if (addItemToInventory(item)) {
                    logMessage(`Automatically claimed ${item.quantity || 1} x ${item.name}.`);
                } else {
                    remainingItems.push(item);
                }
            }
        } else {
            inventoryWasFull = true;
            remainingItems.push(...ordinaryItems);
        }
    }

    delveClaimCache = { items: remainingItems, feed: 0 };
    delveBag = { items: [], feed: 0 };
    updateDelveBagUI();

    const hasPendingClaims = hasDelveClaimCacheRewards();
    const showPendingClaims = () => {
        if (hasPendingClaims) showDelveClaimCachePopup(inventoryWasFull ? 'Your inventory is full.' : '');
    };

    if (hasPendingClaims) {
        logMessage("Operation complete. Unclaimed items are waiting in the Operation Claim Cache.");
    } else {
        logMessage("Operation complete. Your rewards were claimed automatically.");
    }

    if (typeof showRewardSummaryPopup === 'function') {
        setTimeout(() => showRewardSummaryPopup({
            eyebrow: 'OPERATION COMPLETE',
            title: operationName,
            description: 'Recovery manifest for this Operation. Rewards have already been processed.',
            rewards: rewardSummary,
            emptyMessage: 'No rewards were recovered during this Operation.',
            onConfirm: showPendingClaims
        }), 0);
    } else if (hasPendingClaims) {
        setTimeout(showPendingClaims, 0);
    }
}

function stopDelveWithFailure() {
    if (isDelveInProgress) {
        if (currentRunMode === 'patrol') {
            logMessage('Patrol ended. All secured loot was retained.');
        } else {
            logMessage('The Operation failed. Operation Bag loot was lost.');
        }
        delveBag = { items: [], feed: 0 };
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
    if (defeatedEnemy?.isEmpowered && !defeatedEnemy?._experienceRewardIncludesEmpowerment) xp = Math.floor(xp * 1.5);
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
