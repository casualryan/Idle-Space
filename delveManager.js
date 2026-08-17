// Delve deployment, location progression, and encounter sequencing.

function refreshEnergyShieldBetweenDelveEncounters() {
    if (!player?.totalStats) return 0;
    const maximum = Math.max(0, Number(player.totalStats.energyShield) || 0);
    const previous = Math.max(0, Number(player.currentShield) || 0);
    player.currentShield = maximum;
    if (maximum > previous) {
        logMessage(`Energy Shield reconstituted to ${Math.round(maximum)} before the next encounter.`);
    }
    if (typeof updatePlayerStatsDisplay === 'function') updatePlayerStatsDisplay();
    return maximum - previous;
}

function startDeployment(location, mode = 'operation', coreId = null) {
    if (window.activityManager && typeof window.activityManager.isActivityActive === 'function' && window.activityManager.isActivityActive()) {
        window.activityManager.cancelActivity('delveStart', { silent: true });
        if (typeof syncGatheringStateFromManager === 'function') {
            syncGatheringStateFromManager();
        }
        logMessage('Non-combat activity paused for deployment.');
    } else if (isGathering) {
        stopGatheringActivity();
    }

    if (isCombatActive || isDelveInProgress) {
        logMessage('A deployment is already active.');
        return;
    }

    if (mode === 'operation') {
        if (!beginOperationState(location, coreId)) {
            if (coreId) showWarningPopup('That Core is no longer available.');
            return;
        }
        discardDelveClaimCacheForNewDelve();
    } else {
        beginPatrolState();
    }

    // Reset and prepare for deployment
    clearLog();
    logMessage(mode === 'patrol'
        ? `Patrol started in ${location.name}. Loot is secured immediately.`
        : `Operation started in ${location.name}.`);
    currentLocation = location;
    if (mode === 'patrol') window.lastPatrolLocation = location;

    // Make sure health regen is properly initialized before entering delve mode
    // This ensures it's ready to work when the delve ends
    // stopHealthRegen(); // Clear any existing timers
    startHealthRegen(); // Initialize the health regeneration system

    // Now set up the delve
    currentDelveLocation = location;
    currentMonsterIndex = 0;
    isDelveInProgress = true;
    delveBag = { items: [], feed: 0 };
    updateDelveBagUI(); // Update UI when adventure starts
    if (typeof setDelveCombatUIActive === 'function') setDelveCombatUIActive(true);

    // We rely on displayAdventureLocations() to hide the location buttons
    // and show the "Flee" button instead.
    displayAdventureLocations();

    // Begin with the first monster
    beginNextMonsterInSequence();
}

function startAdventure(location, coreId = null) {
    return startDeployment(location, 'operation', coreId);
}

function startPatrol(location) {
    return startDeployment(location, 'patrol', null);
}

function getVisibleDelveLocations() {
    const playerLevel = Math.max(1, Number(player?.level) || 1);

    return locations.filter(location => {
        if (location.developerOnly) return true;

        if (location.locationCategory === 'endgame') {
            return playerLevel >= 48;
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
    // A save made while an event is waiting resumes at that decision instead
    // of silently skipping it and spawning the next encounter.
    if (typeof shouldTriggerOperationEvent === 'function' && shouldTriggerOperationEvent()) {
        if (typeof isOperationEventVisible !== 'function' || !isOperationEventVisible()) showOperationEvent();
        return;
    }

    // Patrols repeat forever. Operations end at their generated or event-modified length.
    if (currentRunMode === 'operation' && currentMonsterIndex >= getOperationEncounterTarget()) {
        console.log("Delve complete - before finalizeDelveLoot - isDelveInProgress:", isDelveInProgress);
        const guaranteedReward = currentDelveLocation?.generatedOperation
            ? completeGeneratedOperation(currentDelveLocation)
            : null;
        if (!currentDelveLocation?.generatedOperation) {
            recordDelveCompletion(currentDelveLocation);
            completedOperationCount = Math.max(0, Math.floor(Number(completedOperationCount) || 0)) + 1;
        }
        finalizeDelveLoot();
        logMessage(guaranteedReward
            ? `Operation complete: ${currentDelveLocation.name}. Guaranteed reward recovered: ${formatOperationReward(guaranteedReward)}.`
            : `Operation complete: ${currentDelveLocation.name}.`);

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

    const queuedEncounter = currentRunMode === 'operation' && operationState?.queuedEncounters?.length
        ? operationState.queuedEncounters.shift()
        : null;
    const queuedModifier = currentRunMode === 'operation' && operationState?.encounterModifiers?.length
        ? operationState.encounterModifiers.shift()
        : null;
    const encounterModifier = { ...(queuedModifier || {}), ...(queuedEncounter || {}) };
    const operationLevel = Math.max(1, Math.min(100, Math.floor(Number(currentDelveLocation?.recommendedLevel) || 1)));
    let encounterEntries;

    if (encounterModifier.kind === 'security') {
        const securityCount = Math.max(1, Math.min(6, 1 + Math.floor(operationLevel / 10)));
        encounterEntries = Array.from({ length: securityCount }, (_, index) => ({
            name: index === 0
                ? 'Security Command Bot'
                : index % 2
                    ? 'Security Interceptor Drone'
                    : 'Security Suppression Drone',
            isEmpowered: index === 0 && Boolean(encounterModifier.empoweredLeader),
            levelOverride: operationLevel,
            lootChanceMultiplier: Number(encounterModifier.lootChanceMultiplier) || 1
        }));
    } else {
        let encounterLocation = currentDelveLocation;
        if (encounterModifier.enemyGroup) {
            const groupTypes = encounterModifier.enemyGroup === 'physical'
                ? ['kinetic', 'slashing']
                : encounterModifier.enemyGroup === 'elemental'
                    ? ['pyro', 'cryo', 'electric']
                    : ['corrosive', 'radiation'];
            const themedEnemies = currentDelveLocation.enemies.filter(entry => {
                const template = (window.enemies || []).find(candidate => candidate.name === entry.name);
                return groupTypes.includes(typeof getEnemyTheme === 'function' ? getEnemyTheme(template) : '');
            });
            if (themedEnemies.length > 0) encounterLocation = { ...currentDelveLocation, enemies: themedEnemies };
        }
        const extraEmpowered = Math.max(0, Math.floor(Number(encounterModifier.extraEmpowered) || 0));
        const enemyCount = Math.max(1, getEncounterEnemyCount(encounterLocation) - extraEmpowered);
        const selectedEnemies = selectWeightedEncounterEnemies(encounterLocation, enemyCount);
        encounterEntries = selectedEnemies.map(selectedEnemy => ({
            name: selectedEnemy.name,
            isEmpowered: Boolean(selectedEnemy.empoweredChance && Math.random() < selectedEnemy.empoweredChance),
            levelOverride: currentDelveLocation?.deepSector ? operationLevel : null,
            lootChanceMultiplier: Number(encounterModifier.lootChanceMultiplier) || 1
        }));
        for (let index = 0; index < extraEmpowered && encounterEntries.length < 6; index++) {
            const extra = selectWeightedEncounterEnemies(encounterLocation, 1)[0];
            if (extra) encounterEntries.push({
                name: extra.name,
                isEmpowered: true,
                levelOverride: currentDelveLocation?.deepSector ? operationLevel : null,
                lootChanceMultiplier: Number(encounterModifier.lootChanceMultiplier) || 1
            });
        }
    }
    const selectedEnemies = encounterEntries;
    if (selectedEnemies.length === 0) {
        console.error("Enemy pool is empty.");
        stopCombat('enemyPoolEmpty');
        return;
    }
    if (currentRunMode === 'operation' && operationState?.forceEliteNext && encounterEntries.length > 0) {
        encounterEntries[0].isEmpowered = true;
        operationState.forceEliteNext = false;
    }
    if (encounterModifier.empoweredLeader && encounterEntries.length > 0) encounterEntries[0].isEmpowered = true;
    if (currentRunMode === 'operation' && operationState) {
        operationState.activeEncounterMeta = {
            reward: encounterModifier.reward || null,
            bountyId: encounterModifier.bountyId || null,
            materialGroup: encounterModifier.materialGroup || null
        };
    }
    spawnEnemyEncounter(encounterEntries);
}

window.startPatrol = startPatrol;
