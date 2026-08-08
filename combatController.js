// Combat lifecycle, timers, entity preparation, and encounter spawning.

// ============================================================================
// 2. CORE COMBAT LOOP
// ============================================================================

// Fix startCombat function to avoid recursive issues
function startCombat() {
    if (isCombatActive) {
        console.log("Combat already active");
        return;
    }

    if (!currentLocation) {
        console.error("No current location set. Cannot start combat.");
        return;
    }

    if (window.activityManager && typeof window.activityManager.isActivityActive === 'function' && window.activityManager.isActivityActive()) {
        window.activityManager.cancelActivity('combatStart', { silent: true });
        if (typeof syncGatheringStateFromManager === 'function') {
            syncGatheringStateFromManager();
        }
        logMessage('Non-combat activity paused for combat.');
    } else if (isGathering) {
        stopGatheringActivity();
    }

    // Recalculate combat stats without healing between delve encounters.
    console.log("Starting combat - preparing player stats");
    preparePlayerForCombat();

    isCombatActive = true;

    // Initialize enemy (but don't call spawnEnemy recursively from spawnEnemyForSequence)
    if (!enemy) {
        spawnEnemy();
    }

    // Player buffs and debuffs were cleared while preserving current resources.

    if (enemy) {
        clearBuffs(enemy);
        ensureEntityInitialization(enemy, false);
    } else {
        console.error("Failed to spawn enemy");
        stopCombat('enemySpawnFailed');
        return;
    }

    // Ensure both attack timers are reset
    playerAttackTimer = 0;
    enemyAttackTimer = 0;

    // Initialize attack times based on attack speeds
    refreshPlayerAttackInterval();
    enemyNextAttackTime = 1 / (enemy.totalStats.attackSpeed || 1);

    startHealthRegen();

    // Start combat loop
    lastCombatLoopTime = Date.now();
    combatInterval = setInterval(combatLoop, 100);
    console.log("Combat started.");

    setFleeControlState({ visible: true });

    // Debug output player stats
    console.log("Player stats at combat start:", {
        currentHealth: player.currentHealth,
        totalHealth: player.totalStats.health,
        currentShield: player.currentShield,
        totalShield: player.totalStats.energyShield
    });

    // Force update displays immediately
    updatePlayerStatsDisplay();
    updateEnemyStatsDisplay();

    // Update the adventure locations display (e.g., change to 'Flee' button)
    displayAdventureLocations();
}

function combatLoop() {
    if (!isCombatActive) return;

    let now = Date.now();
    let deltaTime = (now - lastCombatLoopTime) / 1000;
    lastCombatLoopTime = now;

    // Process attack timers
    if (player) {
        // Initialize player attack time if needed
        if (playerNextAttackTime <= 0) {
            refreshPlayerAttackInterval();
        }

        // Player attack timer
        playerAttackTimer += deltaTime;
        if (playerAttackTimer >= playerNextAttackTime) {
            playerAttackTimer = 0;
            refreshPlayerAttackInterval();

            // Only call playerAttack if player and enemy both exist
            if (player && enemy) {
                playerAttack();
            }
        }

        // Update player progress bar
        let playerProgress = Math.min((playerAttackTimer / playerNextAttackTime) * 100, 100);
        setAttackProgressBar('player', playerProgress);
    }

    // Process enemy attack timer separately to avoid null issues
    if (enemy && enemy.totalStats) {
        // Initialize enemy attack time if needed
        if (enemyNextAttackTime <= 0) {
            enemyNextAttackTime = 1 / (enemy.totalStats.attackSpeed || 1);
        }

        // Enemy attack timer
        enemyAttackTimer += deltaTime;
        if (enemyAttackTimer >= enemyNextAttackTime) {
            enemyAttackTimer = 0;
            enemyNextAttackTime = 1 / (enemy.totalStats.attackSpeed || 1);

            // Only call enemyAttack if player and enemy both exist
            if (player && enemy) {
                enemyAttack();
            }
        }

        // Update enemy progress bar
        let enemyProgress = Math.min((enemyAttackTimer / enemyNextAttackTime) * 100, 100);
        setAttackProgressBar('enemy', enemyProgress);
    }

    // Safely process entity buffs and debuffs
    try {
        if (player) {
            processBuffs(player, deltaTime);
            if (player.currentHealth > 0) {
                if (window.processDebuffs && Array.isArray(player.activeDebuffs)) {
                    window.processDebuffs(player, deltaTime);
                }
            }
        }

        if (enemy) {
            if (enemy.activeBuffs) {
                processBuffs(enemy, deltaTime);
            }
            if (enemy.currentHealth > 0) {
                // Process debuffs on the enemy
                if (window.processDebuffs && typeof window.processDebuffs === 'function' && enemy.activeDebuffs) {
                    window.processDebuffs(enemy, deltaTime);
                }
            }
        }
    } catch (error) {
        console.error("Error processing effects:", error);
    }

    // Check end conditions
    if (player && player.currentHealth <= 0) {
        stopCombat('playerDefeated');
        return;
    }
    else if (enemy && enemy.currentHealth <= 0) {
        // We handle that in applyDamage
    }

    // Update displays at end of loop
    updatePlayerStatsDisplay();
    updateEnemyStatsDisplay();
}

// Function to stop combat
function stopCombat(reason) {
    // Allow delveCompleted to proceed even if combat is already inactive
    if (!isCombatActive && !isDelveInProgress && reason !== 'delveCompleted') {
        console.log("Combat already inactive. stopCombat() aborted.");
        return;
    }

    if (isCombatActive) {
        isCombatActive = false;
        clearInterval(combatInterval);
        combatInterval = null;
    }

    // Clear any inter-fight timers
    if (interFightPauseTimer) {
        clearTimeout(interFightPauseTimer);
        interFightPauseTimer = null;
    }

    // Log the reason combat was stopped
    if (reason) {
        logMessage(`Combat stopped due to: ${reason}`);
    }

    // Reset combat UI and timers
    playerAttackTimer = 0;
    enemyAttackTimer = 0;
    playerNextAttackTime = 0;  // Reset playerNextAttackTime
    enemyNextAttackTime = 0;   // Reset enemyNextAttackTime
    resetAttackProgressBars();
    setFleeControlState({ visible: false, enabled: true });

    // Only restore player health when fleeing or completing a delve
    // NOT between delve fights
    if (reason === 'playerFled' || reason === 'delveCompleted' || reason === 'playerDefeated') {
        player.currentHealth = player.totalStats.health;
        player.currentShield = player.totalStats.energyShield;
        updatePlayerStatsDisplay();

        // Always restart health regeneration after combat ends with fleeing, defeat, or delve completion
        startHealthRegen();
    }

    // Clear any active debuffs on the player and enemy
    if (player && player.activeDebuffs && player.activeDebuffs.length > 0) {
        for (const debuff of player.activeDebuffs) {
            if (debuff.onRemove) {
                debuff.onRemove(player);
            }
        }
        player.activeDebuffs = [];
    }

    if (enemy && enemy.activeDebuffs && enemy.activeDebuffs.length > 0) {
        for (const debuff of enemy.activeDebuffs) {
            if (debuff.onRemove) {
                debuff.onRemove(enemy);
            }
        }
        enemy.activeDebuffs = [];
    }

    // Handle delve state based on reason
    if (isDelveInProgress) {
        if (reason === 'playerFled' || reason === 'playerDefeated') {
            stopDelveWithFailure();

            // Return to adventure location selection
            isDelveInProgress = false;
            currentDelveLocation = null;
            currentMonsterIndex = 0;
            displayAdventureLocations();

            // Restart health regeneration as we're no longer in a delve
            stopHealthRegen();
            startHealthRegen();
        }
        else if (reason === 'enemyDefeated') {
            dropLoot(enemy);

            // Don't end the delve, we'll handle the next monster
            currentMonsterIndex++;

            // Every encounter starts clean; buffs and debuffs do not carry forward.
            clearBuffs(player);
            if (enemy) {
                clearBuffs(enemy);
            }

            // Don't restore health between delve fights
            // Wait 3 seconds before beginning the next fight
            interFightPauseTimer = setTimeout(() => {
                beginNextMonsterInSequence();
            }, 3000);
        }
    }

    // Handle delve completion outside the isDelveInProgress condition
    if (reason === 'delveCompleted') {
        console.log("stopCombat - delveCompleted - before setting flags - isDelveInProgress:", isDelveInProgress);
        // Mark success regardless of current isDelveInProgress flag value
        isDelveInProgress = false;
        currentDelveLocation = null;
        currentMonsterIndex = 0;
        console.log("stopCombat - delveCompleted - after setting flags - isDelveInProgress:", isDelveInProgress);

        // Call displayAdventureLocations to refresh the UI
        displayAdventureLocations();
        // Auto re-deploy if user has it enabled
        try {
            const auto = localStorage.getItem('autoRedeploy') === 'true';
            if (auto && window.lastDelveLocation && !hasDelveClaimCacheRewards()) {
                setTimeout(() => startAdventure(window.lastDelveLocation), 500);
            } else if (auto && hasDelveClaimCacheRewards()) {
                logMessage('Auto re-deploy paused until the Delve Claim Cache is cleared.');
            }
        } catch (e) { /* ignore */ }
        console.log("stopCombat - delveCompleted - after displayAdventureLocations");

        // Restart health regeneration as we're no longer in a delve
        stopHealthRegen();
        startHealthRegen();
    }

    // Non-delve combat: award loot directly to inventory
    if (reason === 'enemyDefeated' && enemy && !isDelveInProgress) {
        dropLoot(enemy);
    }

    // Clean up combat state
    if (enemy) clearBuffs(enemy);
    enemy = null;
    updateEnemyStatsDisplay();
    initializeEnemyStatsDisplay();

    // Stop health regeneration if we're completely stopping combat, but not for inter-fight pauses
    if (!isDelveInProgress || reason === 'playerFled' || reason === 'playerDefeated' || reason === 'delveCompleted') {
        stopHealthRegen();
    }
}

// Function to flee combat
function fleeCombat() {
    if (isCombatActive) {
        stopCombat('playerFled');
        logMessage("You have fled from combat.");
        currentLocation = null;
    } else {
        logMessage("You are not in combat.");
        // If not in combat, but a countdown is active, cancel it
        if (adventureStartCountdownInterval) {
            clearInterval(adventureStartCountdownInterval);
            adventureStartCountdownInterval = null;
            hideNextEnemyTimer();
            logMessage("You have canceled the adventure.");
            currentLocation = null;
            displayAdventureLocations();
        }
    }

    // Update the adventure locations display
    displayAdventureLocations();
}

// ============================================================================
// 3. ENTITY MANAGEMENT
// ============================================================================

// Define spawnEnemy function
function spawnEnemy() {
    if (!currentLocation || !currentLocation.enemies || currentLocation.enemies.length === 0) {
        console.error("No enemies defined for current location.");
        return null;
    }

    // Create a pool of enemies based on spawn rates
    let enemyPool = [];
    for (let locEnemy of currentLocation.enemies) {
        // Use weight/spawnRate to determine how many copies go into the pool
        const weight = locEnemy.spawnRate || 1;
        for (let i = 0; i < weight; i++) {
            enemyPool.push(locEnemy.name);
        }
    }

    if (enemyPool.length === 0) {
        console.error("Enemy pool is empty.");
        return null;
    }

    // Select a random enemy from the pool
    const randomIndex = Math.floor(Math.random() * enemyPool.length);
    const selectedEnemyName = enemyPool[randomIndex];

    // Now spawn this enemy
    spawnEnemyForSequence(selectedEnemyName, false);
}

function spawnEnemyForSequence(monsterName, isEmpowered = false) {
    // Reset attack timers
    playerAttackTimer = 0;
    enemyAttackTimer = 0;

	// Look up the enemy template (prefer window.enemies if available)
	const enemyPool = (Array.isArray(window.enemies) && window.enemies.length)
		? window.enemies
		: (typeof enemies !== 'undefined' ? enemies : []);
	const enemyTemplate = enemyPool.find(e => e.name === monsterName);
	if (!enemyTemplate) {
		// Fallback: try a tolerant comparison ignoring punctuation/case
		const normalize = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
		const target = normalize(monsterName);
		const fallback = enemyPool.find(e => e && normalize(e.name) === target) || null;
		if (!fallback) {
			console.error(`Enemy template not found: ${monsterName}`);
			stopCombat('enemyTemplateNotFound');
			return;
		}
		// use fallback if found
		enemy = JSON.parse(JSON.stringify(fallback));
	} else {
		// Clone from the template
		enemy = JSON.parse(JSON.stringify(enemyTemplate));
	}

	// Initialize basic properties
	enemy.activeBuffs = [];
	enemy.effects = enemy.effects || [];

    // Initialize enemy's current health
    enemy.currentHealth = enemy.health;
    enemy.currentShield = enemy.energyShield || 0;

    // Calculate initial totalStats using the centralized function
    if (typeof calculateEnemyStats === 'function') {
        calculateEnemyStats(enemy);
    } else {
        console.error("calculateEnemyStats function not found during enemy spawn!");
    }

    // Apply empowered bonuses if applicable
    if (isEmpowered) {
        enemy.isEmpowered = true;
        // Boost stats
        enemy.health = Math.round(enemy.health * 1.5);
        enemy.currentHealth = enemy.health; // Reset current health to new max

        if (enemy.energyShield) {
            enemy.energyShield = Math.round(enemy.energyShield * 1.5);
            enemy.currentShield = enemy.energyShield;
        }

        // Boost all damage types by 50%
        if (enemy.damageTypes) {
            for (let damageType in enemy.damageTypes) {
                enemy.damageTypes[damageType] = Math.round(enemy.damageTypes[damageType] * 1.5);
            }
        }

        // Add 'Empowered' to the name
        enemy.name = "Empowered " + enemy.name;

        // Update totalStats again after empowerment using the centralized function
        if (typeof calculateEnemyStats === 'function') {
            calculateEnemyStats(enemy);
        } else {
            console.error("calculateEnemyStats function not found after empowerment!");
        }

        // Add a visual indicator
        logMessage(`An empowered ${monsterName} appears!`);
    }

    clearLog();
    updateEnemyStatsDisplay();

    // Initialize attack timers if combat is already active
    if (isCombatActive) {
        refreshPlayerAttackInterval();
        enemyNextAttackTime = 1 / (enemy.totalStats.attackSpeed || 1);
    }

    if (!isCombatActive) {
        startCombat();
    }

    setFleeControlState({ enabled: true });

    logMessage(`A ${enemy.name} appears!`);

    // Debug info
    console.log("Enemy spawned:", enemy);
}

// Add this function to ensure entities are properly initialized
function ensureEntityInitialization(entity, isPlayer) {
    if (!entity) {
        console.error(`Attempted to initialize ${isPlayer ? 'player' : 'enemy'} but entity is null`);
        return false;
    }

    // Ensure basic properties exist
    if (!entity.effects) entity.effects = [];
    if (!entity.activeBuffs) entity.activeBuffs = [];
    if (!entity.activeDebuffs) entity.activeDebuffs = [];
    entity.isPlayer = Boolean(isPlayer);
    entity.isEnemy = !isPlayer;

    // Ensure totalStats exists
    if (!entity.totalStats) {
        entity.totalStats = {};
    }

    // Ensure damage types and defense types exist in totalStats
    if (!entity.totalStats.damageTypes) {
        entity.totalStats.damageTypes = {};
    }

    if (!entity.totalStats.defenseTypes) {
        entity.totalStats.defenseTypes = {};
    }

    // Ensure health values
    if (entity.currentHealth === undefined || entity.currentHealth === null) {
        console.warn(`Initializing ${isPlayer ? 'player' : 'enemy'} currentHealth`);
        if (isPlayer) {
            entity.currentHealth = entity.totalStats?.health || 100;
        } else {
            entity.currentHealth = entity.health || 100;
        }
    }

    if (entity.currentShield === undefined || entity.currentShield === null) {
        console.warn(`Initializing ${isPlayer ? 'player' : 'enemy'} currentShield`);
        if (isPlayer) {
            entity.currentShield = entity.totalStats?.energyShield || 0;
        } else {
            entity.currentShield = entity.energyShield || 0;
        }
    }

    // Ensure attack speed is set
    if (!entity.totalStats.attackSpeed) {
        if (isPlayer) {
            entity.totalStats.attackSpeed = 1; // Default value if not set
        } else {
            // For enemy, use base attackSpeed or default to 1
            entity.totalStats.attackSpeed = entity.attackSpeed || 1;
        }
    }

    // Ensure totalStats
    if (isPlayer) {
        // For player, use calculateStats method
        if (typeof entity.calculateStats === 'function') {
            entity.calculateStats();
        } else {
            console.error("Player's calculateStats method is missing!");
            return false;
        }
    } else {
        // For enemy, use the new centralized function
        try {
            // Ensure calculateEnemyStats is available (from stats.js)
            if (typeof calculateEnemyStats === 'function') {
                calculateEnemyStats(entity);
            } else {
                 console.error("calculateEnemyStats function not found!");
                 return false;
            }
        } catch (error) {
            console.error("Error calculating enemy stats:", error);
            return false;
        }
    }

    try {
        assertCombatantReference(entity, isPlayer ? 'player combatant' : 'enemy combatant');
    } catch (error) {
        console.error(error.message);
        return false;
    }

    return true;
}

function preparePlayerForCombat() {
    const previousHealth = player.currentHealth;
    const previousShield = player.currentShield;

    clearBuffs(player);
    player.calculateStats();

    player.currentHealth = previousHealth == null
        ? player.totalStats.health
        : Math.max(0, Math.min(previousHealth, player.totalStats.health));
    player.currentShield = previousShield == null
        ? player.totalStats.energyShield
        : Math.max(0, Math.min(previousShield, player.totalStats.energyShield));

    updatePlayerStatsDisplay();
    console.log("Player prepared for combat:", player);
}
