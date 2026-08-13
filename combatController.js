// Combat lifecycle, timers, entity preparation, and encounter spawning.

// ============================================================================
// 2. CORE COMBAT LOOP
// ============================================================================

const ENEMY_SLOT_ORDER = Object.freeze([
    'top-center', 'top-left', 'top-right', 'bottom-center', 'bottom-left', 'bottom-right'
]);
const DEFAULT_TARGET_SLOT_PRIORITY = Object.freeze([1, 4, 0, 3, 2, 5]);

function getLivingEnemies() {
    return (Array.isArray(encounterEnemies) ? encounterEnemies : []).filter(candidate => candidate && candidate.currentHealth > 0);
}

function getEnemyByCombatId(combatId) {
    return (Array.isArray(encounterEnemies) ? encounterEnemies : []).find(candidate => candidate?._combatId === combatId) || null;
}

function getDefaultEnemyTarget() {
    const living = getLivingEnemies();
    return living.sort((a, b) => {
        const aPriority = DEFAULT_TARGET_SLOT_PRIORITY.indexOf(Number(a._slotIndex));
        const bPriority = DEFAULT_TARGET_SLOT_PRIORITY.indexOf(Number(b._slotIndex));
        return (aPriority < 0 ? 99 : aPriority) - (bPriority < 0 ? 99 : bPriority);
    })[0] || null;
}

function selectEnemyTarget(targetOrId, options = {}) {
    const target = typeof targetOrId === 'string' ? getEnemyByCombatId(targetOrId) : targetOrId;
    if (!target || target.currentHealth <= 0) return false;
    selectedEnemyId = target._combatId;
    enemy = target;
    if (!options.silent && typeof logMessage === 'function') logMessage(`Target locked: ${target.name}.`);
    if (typeof updateEnemyStatsDisplay === 'function') updateEnemyStatsDisplay();
    return true;
}

function ensureSelectedEnemyTarget() {
    const selected = getEnemyByCombatId(selectedEnemyId);
    if (selected?.currentHealth > 0) {
        enemy = selected;
        return selected;
    }
    const fallback = getDefaultEnemyTarget();
    if (fallback) selectEnemyTarget(fallback, { silent: true });
    else {
        selectedEnemyId = null;
        enemy = null;
    }
    return fallback;
}

function clearTauntOverride(options = {}) {
    const previous = tauntOverride ? getEnemyByCombatId(tauntOverride.enemyId) : null;
    tauntOverride = null;
    if (!options.silent && previous && typeof logMessage === 'function') {
        logMessage(`${previous.name}'s taunt expires. Attacks return to the selected target.`);
    }
}

function getEffectivePlayerTarget(now = Date.now()) {
    if (tauntOverride) {
        const taunter = getEnemyByCombatId(tauntOverride.enemyId);
        if (taunter?.currentHealth > 0 && Number(tauntOverride.expiresAt) > now) return taunter;
        clearTauntOverride({ silent: !taunter });
    }
    return ensureSelectedEnemyTarget();
}

function activateEnemyTaunt(source, durationSeconds) {
    if (!source || source.currentHealth <= 0) return false;
    const duration = Math.max(0.25, Number(durationSeconds) || 0);
    tauntOverride = {
        enemyId: source._combatId,
        expiresAt: Date.now() + duration * 1000
    };
    if (typeof logMessage === 'function') {
        logMessage(`${source.name} taunts the player for ${duration.toFixed(duration % 1 ? 1 : 0)} seconds.`);
    }
    if (typeof updateEnemyStatsDisplay === 'function') updateEnemyStatsDisplay();
    return true;
}

function processEnemyTaunts(deltaTime) {
    getEffectivePlayerTarget();
    const livingEnemies = getLivingEnemies();
    if (livingEnemies.length < 2) return;
    let readyTaunter = null;
    for (const candidate of livingEnemies) {
        const ability = candidate.tauntAbility;
        if (!ability) continue;
        candidate._tauntCooldownRemaining = Math.max(
            0,
            Number(candidate._tauntCooldownRemaining ?? ability.initialDelay ?? ability.cooldown ?? 10) - deltaTime
        );
        if (!readyTaunter && candidate._tauntCooldownRemaining <= 0) readyTaunter = candidate;
    }

    if (tauntOverride || !readyTaunter) return;
    readyTaunter._tauntCooldownRemaining = Math.max(1, Number(readyTaunter.tauntAbility.cooldown) || 10);
    activateEnemyTaunt(readyTaunter, readyTaunter.tauntAbility.duration);
}

function getEncounterEnemyCount(location, random = Math.random) {
    if (!location || location.developerOnly || Number(location.maxEnemies) === 1) return 1;
    const level = Math.max(1, Number(location.recommendedLevel) || 1);
    let distribution;
    if (level < 10) distribution = [[1, 0.85], [2, 0.15]];
    else if (level < 20) distribution = [[1, 0.25], [2, 0.6], [3, 0.15]];
    else if (level < 30) distribution = [[2, 0.25], [3, 0.55], [4, 0.2]];
    else if (level < 40) distribution = [[3, 0.25], [4, 0.55], [5, 0.2]];
    else if (level < 50) distribution = [[4, 0.25], [5, 0.55], [6, 0.2]];
    else distribution = [[4, 0.1], [5, 0.3], [6, 0.6]];

    const roll = Math.min(0.999999, Math.max(0, typeof random === 'function' ? random() : Number(random) || 0));
    let cumulative = 0;
    for (const [count, weight] of distribution) {
        cumulative += weight;
        if (roll < cumulative) return count;
    }
    return distribution[distribution.length - 1][0];
}

function selectWeightedEncounterEnemies(location, count, random = Math.random) {
    const authored = Array.isArray(location?.enemies) ? location.enemies : [];
    const selected = [];
    const selectedRareNames = new Set();

    for (let slot = 0; slot < Math.max(1, Math.min(6, Number(count) || 1)); slot++) {
        const eligible = authored.filter(entry => Number(entry.spawnRate || 1) > 1 || !selectedRareNames.has(entry.name));
        if (eligible.length === 0) break;
        const totalWeight = eligible.reduce((sum, entry) => sum + Math.max(1, Number(entry.spawnRate) || 1), 0);
        let roll = (typeof random === 'function' ? random() : Math.random()) * totalWeight;
        let chosen = eligible[eligible.length - 1];
        for (const entry of eligible) {
            roll -= Math.max(1, Number(entry.spawnRate) || 1);
            if (roll < 0) {
                chosen = entry;
                break;
            }
        }
        selected.push(chosen);
        if (Number(chosen.spawnRate || 1) <= 1) selectedRareNames.add(chosen.name);
    }
    return selected;
}

function findEnemyTemplate(monsterName) {
    const registry = Array.isArray(window.enemies) ? window.enemies : [];
    const direct = registry.find(candidate => candidate.name === monsterName);
    if (direct) return direct;
    const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return registry.find(candidate => normalize(candidate?.name) === normalize(monsterName)) || null;
}

function createEnemyInstance(monsterName, isEmpowered, slotIndex, rewardScale) {
    const template = findEnemyTemplate(monsterName);
    if (!template) throw new Error(`Enemy template not found: ${monsterName}`);
    const instance = JSON.parse(JSON.stringify(template));
    instance.activeBuffs = [];
    instance.activeDebuffs = [];
    instance.effects = instance.effects || [];
    instance._slotIndex = slotIndex;
    instance._slotName = ENEMY_SLOT_ORDER[slotIndex] || `slot-${slotIndex}`;
    instance._combatId = `${instance.id || String(monsterName).replace(/[^a-z0-9]/gi, '-')}-${encounterSerial}-${slotIndex}`;
    instance._rewardScale = Math.max(0, Number(rewardScale) || 0);
    instance._tauntCooldownRemaining = Math.max(0, Number(instance.tauntAbility?.initialDelay ?? 0));
    instance._defeatHandled = false;

    if (isEmpowered) {
        instance.isEmpowered = true;
        instance.health = Math.round(Number(instance.health || 1) * 1.5);
        instance.energyShield = Math.round(Number(instance.energyShield || 0) * 1.5);
        for (const damageType of Object.keys(instance.damageTypes || {})) {
            instance.damageTypes[damageType] = Math.round(Number(instance.damageTypes[damageType] || 0) * 1.5);
        }
        instance.name = `Empowered ${instance.name}`;
    }

    instance.currentHealth = instance.health;
    instance.currentShield = instance.energyShield || 0;
    if (typeof calculateEnemyStats === 'function') calculateEnemyStats(instance);
    ensureEntityInitialization(instance, false);
    return instance;
}

function assignEncounterExperienceRewards(group) {
    const allocations = group.map(candidate => {
        const empoweredMultiplier = candidate.isEmpowered ? 1.5 : 1;
        const exact = Math.max(0, Number(candidate.experienceValue || 0))
            * Math.max(0, Number(candidate._rewardScale ?? 1))
            * empoweredMultiplier;
        return { candidate, exact, awarded: Math.floor(exact) };
    });
    let remainder = Math.max(0, Math.floor(allocations.reduce((sum, entry) => sum + entry.exact, 0) + 1e-9))
        - allocations.reduce((sum, entry) => sum + entry.awarded, 0);
    allocations.sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)));
    for (const allocation of allocations) {
        if (remainder <= 0) break;
        allocation.awarded++;
        remainder--;
    }
    for (const allocation of allocations) {
        allocation.candidate._experienceReward = allocation.awarded;
        allocation.candidate._experienceRewardIncludesEmpowerment = true;
    }
}

function spawnEnemyEncounter(encounterEntries) {
    const entries = Array.isArray(encounterEntries) ? encounterEntries : [];
    if (entries.length === 0) return false;
    encounterSerial++;
    const rewardScale = 1 / entries.length;
    encounterEnemies = entries.map((entry, slotIndex) => createEnemyInstance(
        entry.name,
        Boolean(entry.isEmpowered),
        slotIndex,
        rewardScale
    ));
    assignEncounterExperienceRewards(encounterEnemies);
    selectedEnemyId = null;
    tauntOverride = null;
    enemyAttackTimers = {};
    enemyNextAttackTimes = {};
    ensureSelectedEnemyTarget();
    clearLog();
    if (typeof updateEnemyStatsDisplay === 'function') updateEnemyStatsDisplay();
    if (!isCombatActive) startCombat();
    for (const spawned of encounterEnemies) logMessage(`A ${spawned.name} appears!`);
    return true;
}

function spawnEnemy() {
    if (!currentLocation?.enemies?.length) return null;
    const entry = selectWeightedEncounterEnemies(currentLocation, 1)[0];
    if (!entry) return null;
    spawnEnemyEncounter([{ name: entry.name, isEmpowered: false }]);
    return enemy;
}

function spawnEnemyForSequence(monsterName, isEmpowered = false) {
    spawnEnemyEncounter([{ name: monsterName, isEmpowered }]);
}

function startCombat() {
    if (isCombatActive) return;
    if (!currentLocation) {
        console.error('No current location set. Cannot start combat.');
        return;
    }
    if (window.activityManager?.isActivityActive?.()) {
        window.activityManager.cancelActivity('combatStart', { silent: true });
        if (typeof syncGatheringStateFromManager === 'function') syncGatheringStateFromManager();
    } else if (isGathering) {
        stopGatheringActivity();
    }
    if (getLivingEnemies().length === 0) {
        spawnEnemy();
        return;
    }

    if (typeof cancelPropagationPresentations === 'function') cancelPropagationPresentations();
    preparePlayerForCombat();
    if (typeof resetCombatStyleState === 'function') resetCombatStyleState(player);
    isCombatActive = true;
    playerAttackTimer = 0;
    enemyAttackTimer = 0;
    enemyAttackTimers = {};
    enemyNextAttackTimes = {};
    refreshPlayerAttackInterval();
    for (const candidate of getLivingEnemies()) {
        clearBuffs(candidate);
        ensureEntityInitialization(candidate, false);
        enemyAttackTimers[candidate._combatId] = 0;
        enemyNextAttackTimes[candidate._combatId] = 1 / (candidate.totalStats.attackSpeed || 1);
    }
    startHealthRegen();
    lastCombatLoopTime = Date.now();
    combatInterval = setInterval(combatLoop, 100);
    setFleeControlState({ visible: true });
    if (typeof setDelveCombatUIActive === 'function') setDelveCombatUIActive(true);
    updatePlayerStatsDisplay();
    updateEnemyStatsDisplay();
    displayAdventureLocations();
}

function combatLoop() {
    if (!isCombatActive) return;
    const now = Date.now();
    const deltaTime = Math.max(0, (now - lastCombatLoopTime) / 1000);
    lastCombatLoopTime = now;
    // Propagation resolves atomically before it is drawn. Pause later combat
    // events while that frozen record is presented so a subsequent DOT tick or
    // attack cannot appear to land ahead of an in-flight propagation hit.
    if (typeof isPropagationPresentationBusy === 'function' && isPropagationPresentationBusy()) return;
    processEnemyTaunts(deltaTime);

    if (player) {
        if (playerNextAttackTime <= 0) refreshPlayerAttackInterval();
        playerAttackTimer += deltaTime;
        if (playerAttackTimer >= playerNextAttackTime) {
            playerAttackTimer = 0;
            refreshPlayerAttackInterval();
            if (getEffectivePlayerTarget()) playerAttack();
            if (typeof isPropagationPresentationBusy === 'function' && isPropagationPresentationBusy()) return;
        }
        setAttackProgressBar('player', Math.min((playerAttackTimer / playerNextAttackTime) * 100, 100));
    }

    for (const attacker of getLivingEnemies()) {
        const id = attacker._combatId;
        let nextAttack = Number(enemyNextAttackTimes[id]) || (1 / (attacker.totalStats.attackSpeed || 1));
        let timer = Number(enemyAttackTimers[id]) || 0;
        timer += deltaTime;
        if (timer >= nextAttack) {
            timer = 0;
            nextAttack = 1 / (attacker.totalStats.attackSpeed || 1);
            enemyAttack(attacker);
            if (!isCombatActive || player.currentHealth <= 0) return;
        }
        enemyAttackTimers[id] = timer;
        enemyNextAttackTimes[id] = nextAttack;
        setAttackProgressBar(attacker, Math.min((timer / nextAttack) * 100, 100));
    }

    try {
        processBuffs(player, deltaTime);
        if (player.currentHealth > 0 && window.processDebuffs && Array.isArray(player.activeDebuffs)) {
            window.processDebuffs(player, deltaTime);
        }
        for (const candidate of getLivingEnemies()) {
            if (candidate.activeBuffs) processBuffs(candidate, deltaTime);
            if (window.processDebuffs && Array.isArray(candidate.activeDebuffs)) {
                window.processDebuffs(candidate, deltaTime);
            }
        }
    } catch (error) {
        console.error('Error processing combat effects:', error);
    }

    if (player.currentHealth <= 0) {
        stopCombat('playerDefeated');
        return;
    }
    updatePlayerStatsDisplay();
    updateEnemyStatsDisplay();
}

function clearCombatantDebuffs(combatant) {
    for (const debuff of [...(combatant?.activeDebuffs || [])]) debuff.onRemove?.(combatant);
    if (combatant) combatant.activeDebuffs = [];
}

function resetEncounterState() {
    for (const candidate of Array.isArray(encounterEnemies) ? encounterEnemies : []) {
        clearCombatantDebuffs(candidate);
        clearBuffs(candidate);
    }
    encounterEnemies = [];
    enemy = null;
    selectedEnemyId = null;
    tauntOverride = null;
    enemyAttackTimers = {};
    enemyNextAttackTimes = {};
    enemyAttackTimer = 0;
    enemyNextAttackTime = 0;
}

function stopCombat(reason) {
    if (!isCombatActive && !isDelveInProgress && reason !== 'delveCompleted') return;
    if (typeof cancelPropagationPresentations === 'function') cancelPropagationPresentations();
    if (isCombatActive) {
        isCombatActive = false;
        clearInterval(combatInterval);
        combatInterval = null;
    }
    if (interFightPauseTimer) {
        clearTimeout(interFightPauseTimer);
        interFightPauseTimer = null;
    }
    playerAttackTimer = 0;
    playerNextAttackTime = 0;
    if (typeof resetCombatStyleState === 'function') resetCombatStyleState(player);
    resetAttackProgressBars();
    setFleeControlState({ visible: false, enabled: true });

    if (reason === 'playerFled' || reason === 'delveCompleted' || reason === 'playerDefeated') {
        player.currentHealth = player.totalStats.health;
        player.currentShield = player.totalStats.energyShield;
        updatePlayerStatsDisplay();
        startHealthRegen();
    }
    clearCombatantDebuffs(player);

    if (isDelveInProgress) {
        if (reason === 'playerFled' || reason === 'playerDefeated') {
            stopDelveWithFailure();
            isDelveInProgress = false;
            currentDelveLocation = null;
            currentMonsterIndex = 0;
            stopHealthRegen();
            startHealthRegen();
        } else if (reason === 'enemyDefeated') {
            currentMonsterIndex++;
            clearBuffs(player);
            if (currentDelveLocation && currentMonsterIndex < currentDelveLocation.numFights) {
                refreshEnergyShieldBetweenDelveEncounters();
            }
            resetEncounterState();
            updateEnemyStatsDisplay();
            interFightPauseTimer = setTimeout(beginNextMonsterInSequence, 3000);
            return;
        }
    }

    if (reason === 'delveCompleted') {
        isDelveInProgress = false;
        currentDelveLocation = null;
        currentMonsterIndex = 0;
        try {
            const auto = localStorage.getItem('autoRedeploy') === 'true';
            if (auto && window.lastDelveLocation && !hasDelveClaimCacheRewards()) {
                setTimeout(() => startAdventure(window.lastDelveLocation), 500);
            } else if (auto && hasDelveClaimCacheRewards()) {
                logMessage('Auto re-deploy paused until the Delve Claim Cache is cleared.');
            }
        } catch (error) { /* local storage is optional */ }
        stopHealthRegen();
        startHealthRegen();
    }

    resetEncounterState();
    updateEnemyStatsDisplay();
    initializeEnemyStatsDisplay();
    if (typeof setDelveCombatUIActive === 'function') setDelveCombatUIActive(false);
    displayAdventureLocations();
    if (!isDelveInProgress || ['playerFled', 'playerDefeated', 'delveCompleted'].includes(reason)) stopHealthRegen();
}

function fleeCombat() {
    if (isCombatActive || isDelveInProgress) {
        stopCombat('playerFled');
        logMessage('You have fled from combat.');
        currentLocation = null;
    } else if (adventureStartCountdownInterval) {
        clearInterval(adventureStartCountdownInterval);
        adventureStartCountdownInterval = null;
        hideNextEnemyTimer();
        currentLocation = null;
    }
    displayAdventureLocations();
}

// ============================================================================
// 3. ENTITY MANAGEMENT
// ============================================================================

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
