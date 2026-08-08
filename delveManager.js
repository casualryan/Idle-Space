// Delve deployment, location progression, and encounter sequencing.

function startAdventure(location) {
    if (window.activityManager && typeof window.activityManager.isActivityActive === 'function' && window.activityManager.isActivityActive()) {
        window.activityManager.cancelActivity('delveStart', { silent: true });
        if (typeof syncGatheringStateFromManager === 'function') {
            syncGatheringStateFromManager();
        }
        logMessage('Non-combat activity paused for delve.');
    } else if (isGathering) {
        stopGatheringActivity();
    }

    if (isCombatActive || isDelveInProgress) {
        logMessage("You are already on an adventure!");
        return;
    }

    // Reset and prepare for adventure
    clearLog();
    discardDelveClaimCacheForNewDelve();
    logMessage(`You begin your delve into ${location.name}.`);
    currentLocation = location;
    // Remember for auto re-deploy preference
    window.lastDelveLocation = location;

    // Make sure health regen is properly initialized before entering delve mode
    // This ensures it's ready to work when the delve ends
    // stopHealthRegen(); // Clear any existing timers
    startHealthRegen(); // Initialize the health regeneration system

    // Now set up the delve
    currentDelveLocation = location;
    currentMonsterIndex = 0;
    isDelveInProgress = true;
    delveBag = { items: [], credits: 0 };
    updateDelveBagUI(); // Update UI when adventure starts

    // We rely on displayAdventureLocations() to hide the location buttons
    // and show the "Flee" button instead.
    displayAdventureLocations();

    // Begin with the first monster
    beginNextMonsterInSequence();
}

function getVisibleDelveLocations() {
    const playerLevel = Math.max(1, Number(player?.level) || 1);
    const completed = completedDelveLocations || {};

    return locations.filter(location => {
        if (location.developerOnly) return true;

        if (location.locationCategory === 'endgame') {
            if (playerLevel < 48) return false;
            const tier = Math.max(1, Number(location.endgameTier) || 1);
            if (tier === 1) return true;
            const previousTier = locations.find(candidate =>
                candidate.locationCategory === 'endgame' && Number(candidate.endgameTier) === tier - 1
            );
            return Boolean(previousTier && completed[previousTier.name] > 0);
        }

        return Number(location.recommendedLevel || 1) <= playerLevel + 2;
    });
}

function recordDelveCompletion(location) {
    if (!location?.name) return;
    const previous = Math.max(0, Number(completedDelveLocations[location.name]) || 0);
    completedDelveLocations[location.name] = previous + 1;
}

function beginNextMonsterInSequence() {
    // If we've completed all fights for this location, the delve is complete
    if (currentMonsterIndex >= currentDelveLocation.numFights) {
        console.log("Delve complete - before finalizeDelveLoot - isDelveInProgress:", isDelveInProgress);
        recordDelveCompletion(currentDelveLocation);
        finalizeDelveLoot();
        logMessage(`You have cleared all monsters in ${currentDelveLocation.name}!`);

        // Make sure the isDelveInProgress flag is set to false before stopping combat
        isDelveInProgress = false;
        console.log("Delve complete - after setting flag - isDelveInProgress:", isDelveInProgress);

        // Restore player's HP/shield only when delve is completed
        player.currentHealth = player.totalStats.health;
        player.currentShield = player.totalStats.energyShield;

        clearBuffs(player);

        // Now restart health regeneration
        stopHealthRegen();
        startHealthRegen();
        updatePlayerStatsDisplay();

        // Ensure adventure locations are displayed
        displayAdventureLocations();

        // End the delve with a success reason
        stopCombat('delveCompleted');
        return;
    }

    // Keep the flee control active during the inter-fight pause.
    setFleeControlState({ visible: true, enabled: true });

    // Create a pool of enemies based on spawn rates
    let enemyPool = [];
    for (let locEnemy of currentDelveLocation.enemies) {
        // Use weight/spawnRate to determine how many copies go into the pool
        const weight = locEnemy.spawnRate || 1;
        for (let i = 0; i < weight; i++) {
            enemyPool.push(locEnemy);
        }
    }

    if (enemyPool.length === 0) {
        console.error("Enemy pool is empty.");
        stopCombat('enemyPoolEmpty');
        return;
    }

    // Select a random enemy from the pool
    const randomIndex = Math.floor(Math.random() * enemyPool.length);
    const selectedEnemy = enemyPool[randomIndex];

    // Check if this enemy should be empowered
    let isEmpowered = false;
    if (selectedEnemy.empoweredChance && Math.random() < selectedEnemy.empoweredChance) {
        isEmpowered = true;
    }

    // Spawn the selected enemy
    spawnEnemyForSequence(selectedEnemy.name, isEmpowered);
}
