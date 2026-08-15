// Operation-only Core effects, randomized between-encounter events, and run modifiers.

const OPERATION_BOARD_VERSION = 1;
const OPERATION_BOARD_SIZE = 3;
const OPERATION_SEED_HISTORY_LIMIT = 10;
const OPERATION_NAME_PREFIXES = Object.freeze([
    'Ashen', 'Broken', 'Cold', 'Crimson', 'Dead', 'Echo', 'Feral', 'Fractured',
    'Ghost', 'Hollow', 'Iron', 'Null', 'Obsidian', 'Silent', 'Static', 'Veiled'
]);
const OPERATION_NAME_TARGETS = Object.freeze([
    'Aperture', 'Bastion', 'Conduit', 'Foundry', 'Grid', 'Lattice', 'Relay', 'Spire',
    'Terminal', 'Vault', 'Vector', 'Warren'
]);
const OPERATION_BRIEFINGS = Object.freeze([
    'Hostile signatures are converging around an exposed recovery route.',
    'A narrow insertion window has opened inside a contested machine sector.',
    'Dominion telemetry marks a recoverable payload behind an unstable defense line.',
    'A damaged signal chain reveals a short, high-value strike opportunity.',
    'Scavenger traffic has exposed a guarded cache before the sector can seal again.'
]);
const OPERATION_MATERIAL_BANDS = Object.freeze([
    Object.freeze(['Scrap Metal', 'Wire Bundle', 'Metal Fasteners', 'Basic Servo']),
    Object.freeze(['Titanium', 'Copper Coil', 'Stabilizer', 'Advanced Servo', 'Targeting Module']),
    Object.freeze(['Titanium Plating', 'High-Density Power Cell', 'Quantum Capacitor', 'Advanced Electronic Circuit']),
    Object.freeze(['Phase Converter', 'AI Core Fragment', 'Synthetic Biofluid', 'Temporal Stabilizer']),
    Object.freeze(['Quantum Core', 'Nanite Cluster', 'Flux Crystal', 'Advanced Alloy'])
]);

function hashOperationSeed(value) {
    let hash = 2166136261;
    for (const character of String(value || 'operation')) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function createOperationRandom(seed) {
    let state = hashOperationSeed(seed) || 0x6d2b79f5;
    return function seededOperationRandom() {
        state += 0x6d2b79f5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function createOperationSeed(random = Math.random, now = Date.now) {
    const timestamp = Math.max(0, Math.floor(Number(now()) || Date.now())).toString(36);
    const entropy = Math.floor(Math.min(0.999999999, Math.max(0, random())) * 0x100000000)
        .toString(36)
        .padStart(7, '0');
    return `op-${timestamp}-${entropy}`;
}

function getOperationEnemyPool(recommendedLevel, enemyRegistry = window.enemies || []) {
    const level = Math.max(1, Math.min(50, Math.floor(Number(recommendedLevel) || 1)));
    const eligible = enemyRegistry.filter(enemy => enemy?.name && !enemy.developerOnly && !enemy.isTrainingDummy);
    const nearby = eligible.filter(enemy => Math.abs(Math.max(1, Number(enemy.level) || 1) - level) <= 5);
    const source = nearby.length >= 4
        ? nearby
        : eligible.slice().sort((left, right) => (
            Math.abs(Number(left.level || 1) - level) - Math.abs(Number(right.level || 1) - level)
        )).slice(0, 8);
    return source;
}

function chooseOperationGuaranteedReward(level, random) {
    const rewardKind = Math.floor(random() * 5);
    if (rewardKind === 0) {
        return { kind: 'feed', quantity: Math.round(120 + level * 24 + random() * (80 + level * 9)) };
    }
    if (rewardKind === 1) {
        const caches = (typeof CACHE_DEFINITIONS !== 'undefined' ? CACHE_DEFINITIONS : [])
            .filter(cache => !['flux', 'core'].includes(cache.id));
        const cache = caches[Math.floor(random() * caches.length)] || { id: 'kinetic', name: 'Kinetic Cache' };
        return { kind: 'cache', id: cache.id, name: cache.name, quantity: level >= 36 && random() < 0.25 ? 2 : 1 };
    }
    if (rewardKind === 2) {
        const cores = (typeof CORE_DEFINITIONS !== 'undefined' ? CORE_DEFINITIONS : [])
            .filter(core => Number(core.minLevel || 1) <= level);
        const core = cores[Math.floor(random() * cores.length)] || { id: 'reclamation', name: 'Reclamation Core' };
        return { kind: 'core', id: core.id, name: core.name, quantity: 1 };
    }
    if (rewardKind === 3) {
        const grade = Math.max(1, Math.min(5, Math.ceil(level / 10)));
        return { kind: 'material', name: `Flux ${['I', 'II', 'III', 'IV', 'V'][grade - 1]}`, quantity: level >= 31 ? 2 : 1 };
    }
    const band = Math.max(0, Math.min(OPERATION_MATERIAL_BANDS.length - 1, Math.floor((level - 1) / 10)));
    const pool = OPERATION_MATERIAL_BANDS[band];
    const first = pool[Math.floor(random() * pool.length)];
    let second = pool[Math.floor(random() * pool.length)];
    if (pool.length > 1 && second === first) second = pool[(pool.indexOf(first) + 1) % pool.length];
    const baseQuantity = Math.max(1, 5 - band);
    return {
        kind: 'materialBundle',
        items: [
            { name: first, quantity: baseQuantity + Math.floor(random() * 3) },
            { name: second, quantity: Math.max(1, baseQuantity - 1 + Math.floor(random() * 2)) }
        ]
    };
}

function formatOperationReward(reward) {
    if (!reward || typeof reward !== 'object') return 'Unknown recovery payload';
    const quantity = Math.max(1, Math.floor(Number(reward.quantity) || 1));
    if (reward.kind === 'feed') return `${quantity} Feed`;
    if (reward.kind === 'materialBundle') {
        return (reward.items || []).map(item => `${Math.max(1, Number(item.quantity) || 1)}× ${item.name}`).join(' + ');
    }
    return `${quantity}× ${reward.name || reward.id || 'Resource'}`;
}

function generateOperationOffer(seed, playerLevel = Number(window.player?.level) || 1, enemyRegistry = window.enemies || []) {
    const stableSeed = String(seed || createOperationSeed());
    const random = createOperationRandom(stableSeed);
    const baseLevel = Math.max(1, Math.min(50, Math.floor(Number(playerLevel) || 1)));
    const levelOffset = [-2, 0, 2][Math.floor(random() * 3)] || 0;
    const recommendedLevel = Math.max(1, Math.min(50, baseLevel + levelOffset));
    const availableEnemies = getOperationEnemyPool(recommendedLevel, enemyRegistry);
    const shuffledEnemies = availableEnemies
        .map(enemy => ({ enemy, order: random() }))
        .sort((left, right) => left.order - right.order);
    const enemyCount = Math.min(shuffledEnemies.length, 4 + Math.floor(random() * 3));
    const empoweredChance = Math.min(0.35, 0.03 + Math.floor(recommendedLevel / 10) * 0.035);
    const enemies = shuffledEnemies.slice(0, enemyCount).map(({ enemy }) => ({
        name: enemy.name,
        spawnRate: 1 + Math.floor(random() * 4),
        empoweredChance
    }));
    const prefix = OPERATION_NAME_PREFIXES[Math.floor(random() * OPERATION_NAME_PREFIXES.length)];
    const target = OPERATION_NAME_TARGETS[Math.floor(random() * OPERATION_NAME_TARGETS.length)];
    const encounterCount = Math.max(4, Math.min(10, 4 + Math.floor(recommendedLevel / 10) + Math.floor(random() * 3)));
    const seedHash = hashOperationSeed(stableSeed).toString(36);
    return {
        id: `generated-operation-${seedHash}`,
        operationId: `generated-operation-${seedHash}`,
        seed: stableSeed,
        generatedOperation: true,
        name: `${prefix} ${target}`,
        recommendedLevel,
        enemies,
        numFights: encounterCount,
        description: OPERATION_BRIEFINGS[Math.floor(random() * OPERATION_BRIEFINGS.length)],
        locationCategory: 'operation',
        guaranteedReward: chooseOperationGuaranteedReward(recommendedLevel, random)
    };
}

function normalizeOperationBoard(source, options = {}) {
    const board = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
    const playerLevel = Math.max(1, Math.floor(Number(options.playerLevel ?? window.player?.level) || 1));
    const enemyRegistry = options.enemies || window.enemies || [];
    const random = options.random || Math.random;
    const now = options.now || Date.now;
    const offers = Array.isArray(board.offers)
        ? board.offers.filter(offer => (
            offer?.generatedOperation
            && typeof offer.seed === 'string'
            && typeof offer.operationId === 'string'
            && Array.isArray(offer.enemies)
            && offer.enemies.length > 0
            && offer.guaranteedReward
        )).slice(0, OPERATION_BOARD_SIZE)
        : [];
    let generation = Math.max(0, Math.floor(Number(board.generation) || 0));
    while (offers.length < OPERATION_BOARD_SIZE) {
        const seed = `${createOperationSeed(random, now)}-${generation.toString(36)}-${offers.length}`;
        offers.push(generateOperationOffer(seed, playerLevel, enemyRegistry));
        generation++;
    }
    return { version: OPERATION_BOARD_VERSION, generation, offers };
}

function ensureOperationBoard(options = {}) {
    operationBoard = normalizeOperationBoard(operationBoard, options);
    return operationBoard;
}

function replaceCompletedOperationOffer(operationId, options = {}) {
    const board = ensureOperationBoard(options);
    const index = board.offers.findIndex(offer => offer.operationId === operationId);
    if (index < 0) return null;
    const random = options.random || Math.random;
    const now = options.now || Date.now;
    const seed = `${createOperationSeed(random, now)}-${board.generation.toString(36)}-${index}`;
    const replacement = generateOperationOffer(seed, options.playerLevel ?? window.player?.level, options.enemies || window.enemies || []);
    board.offers[index] = replacement;
    board.generation++;
    return replacement;
}

function stageOperationGuaranteedReward(reward) {
    if (!reward || typeof reward !== 'object') return false;
    if (reward.kind === 'feed') {
        delveBag.feed += Math.max(1, Math.floor(Number(reward.quantity) || 1));
        return true;
    }
    if (reward.kind === 'materialBundle') {
        for (const entry of reward.items || []) {
            const template = (window.materials || []).find(material => material.name === entry.name);
            addItemToDelveBag({ ...(template || { name: entry.name, type: 'Material', stackable: true }), quantity: Math.max(1, Math.floor(Number(entry.quantity) || 1)) });
        }
        return true;
    }
    if (reward.kind === 'core') {
        const definition = typeof getCoreDefinition === 'function' ? getCoreDefinition(reward.id) : null;
        addItemToDelveBag(definition && typeof makeCoreItem === 'function'
            ? makeCoreItem(definition, reward.quantity)
            : { type: 'Core', coreId: reward.id, name: reward.name, stackable: true, quantity: reward.quantity });
        return true;
    }
    if (reward.kind === 'cache') {
        const definition = typeof getCacheDefinition === 'function' ? getCacheDefinition(reward.id) : null;
        addItemToDelveBag(definition && typeof makeCacheItem === 'function'
            ? makeCacheItem(definition, reward.quantity)
            : { type: 'Cache', cacheId: reward.id, name: reward.name, stackable: true, quantity: reward.quantity });
        return true;
    }
    if (reward.kind === 'material') {
        const template = (window.materials || []).find(material => material.name === reward.name);
        addItemToDelveBag({ ...(template || { name: reward.name, type: 'Material', stackable: true }), quantity: Math.max(1, Math.floor(Number(reward.quantity) || 1)) });
        return true;
    }
    return false;
}

function recordCompletedOperationSeed(seed) {
    if (typeof seed !== 'string' || !seed) return completedOperationSeeds;
    completedOperationSeeds = [...(Array.isArray(completedOperationSeeds) ? completedOperationSeeds : []), seed]
        .slice(-OPERATION_SEED_HISTORY_LIMIT);
    completedOperationCount = Math.max(0, Math.floor(Number(completedOperationCount) || 0)) + 1;
    return completedOperationSeeds;
}

function completeGeneratedOperation(location = currentDelveLocation) {
    if (!location?.generatedOperation || !operationState || operationState.guaranteedRewardClaimed) return null;
    const reward = location.guaranteedReward || operationState.guaranteedReward;
    if (!stageOperationGuaranteedReward(reward)) return null;
    operationState.guaranteedRewardClaimed = true;
    recordCompletedOperationSeed(location.seed || operationState.operationSeed);
    replaceCompletedOperationOffer(location.operationId || operationState.operationId);
    return reward;
}

const OPERATION_EVENT_DEFINITIONS = Object.freeze([
    Object.freeze({
        id: 'salvage-fork',
        title: 'Unstable Salvage Vein',
        description: 'A dense feedstock seam crosses a more heavily defended route.',
        choices: Object.freeze([
            Object.freeze({ label: 'Strip the vein', detail: '+30% materials and Caches; enemies deal +12% damage.', apply(state) { state.modifiers.materialFind += 0.3; state.modifiers.cacheFind += 0.3; state.modifiers.enemyDamageMultiplier += 0.12; } }),
            Object.freeze({ label: 'Hold the route', detail: 'Restore 18% maximum HP.', apply() { healOperationPlayer(0.18); } })
        ])
    }),
    Object.freeze({
        id: 'repair-node',
        title: 'Dormant Repair Node',
        description: 'Enough charge remains for one repair protocol.',
        choices: Object.freeze([
            Object.freeze({ label: 'Rebuild integrity', detail: 'Restore 32% maximum HP.', apply() { healOperationPlayer(0.32); } }),
            Object.freeze({ label: 'Overcharge shielding', detail: '+22% Energy Shield; deal 8% less damage.', apply(state) { state.modifiers.energyShieldPercent += 0.22; state.modifiers.damageMultiplier -= 0.08; } })
        ])
    }),
    Object.freeze({
        id: 'elite-signal',
        title: 'Elite Command Signal',
        description: 'A hardened target can be pulled into the remaining route.',
        choices: Object.freeze([
            Object.freeze({ label: 'Intercept', detail: 'Add one empowered encounter; +40% Core and Cache chance.', apply(state) { state.encounterTarget += 1; state.forceEliteNext = true; state.modifiers.coreFind += 0.4; state.modifiers.cacheFind += 0.4; } }),
            Object.freeze({ label: 'Bypass', detail: '+8% damage for the remainder of the Operation.', apply(state) { state.modifiers.damageMultiplier += 0.08; } })
        ])
    }),
    Object.freeze({
        id: 'resistance-inversion',
        title: 'Adaptive Plating Bank',
        description: 'The recovered plates can reinforce one defense profile while destabilizing another.',
        choices: Object.freeze([
            Object.freeze({ label: 'Brace impact channels', detail: '+15 Physical Resistance, −10 Elemental Resistance.', apply(state) { state.modifiers.resistances.physicalResistance += 15; state.modifiers.resistances.elementalResistance -= 10; } }),
            Object.freeze({ label: 'Ground thermal channels', detail: '+15 Elemental Resistance, −10 Physical Resistance.', apply(state) { state.modifiers.resistances.elementalResistance += 15; state.modifiers.resistances.physicalResistance -= 10; } })
        ])
    }),
    Object.freeze({
        id: 'flux-storm',
        title: 'Flux Storm',
        description: 'Condensed energy is building around the route and feeding hostile systems.',
        choices: Object.freeze([
            Object.freeze({ label: 'Harvest it', detail: '+55% Flux chance; enemies deal +15% damage.', apply(state) { state.modifiers.fluxFind += 0.55; state.modifiers.enemyDamageMultiplier += 0.15; } }),
            Object.freeze({ label: 'Vent the field', detail: 'Restore 22% maximum HP.', apply() { healOperationPlayer(0.22); } })
        ])
    })
]);

function createEmptyOperationModifiers() {
    return {
        attackSpeedPercent: 0,
        criticalChance: 0,
        energyShieldPercent: 0,
        damageMultiplier: 0,
        damageTaken: 0,
        enemyDamageMultiplier: 0,
        materialFind: 0,
        fluxFind: 0,
        coreFind: 0,
        cacheFind: 0,
        healAfterEncounter: 0,
        damagePerEncounter: 0,
        enemyDamagePerEncounter: 0,
        resistances: { physicalResistance: 0, elementalResistance: 0, chemicalResistance: 0 }
    };
}

function normalizeOperationState(source) {
    const state = source && typeof source === 'object' ? source : {};
    const defaults = createEmptyOperationModifiers();
    const modifiers = state.modifiers && typeof state.modifiers === 'object' ? state.modifiers : {};
    const fallbackEncounterCount = typeof currentDelveLocation !== 'undefined'
        ? Number(currentDelveLocation?.numFights)
        : 1;
    return {
        activeCoreId: typeof state.activeCoreId === 'string' ? state.activeCoreId : null,
        operationId: typeof state.operationId === 'string' ? state.operationId : null,
        operationSeed: typeof state.operationSeed === 'string' ? state.operationSeed : null,
        guaranteedReward: state.guaranteedReward && typeof state.guaranteedReward === 'object'
            ? state.guaranteedReward
            : null,
        guaranteedRewardClaimed: Boolean(state.guaranteedRewardClaimed),
        encounterTarget: Math.max(1, Math.floor(Number(state.encounterTarget) || fallbackEncounterCount || 1)),
        encountersCompleted: Math.max(0, Math.floor(Number(state.encountersCompleted) || 0)),
        nextEventAt: state.nextEventAt != null && Number.isFinite(Number(state.nextEventAt))
            ? Number(state.nextEventAt)
            : Number.POSITIVE_INFINITY,
        eventCount: Math.max(0, Math.floor(Number(state.eventCount) || 0)),
        forceEliteNext: Boolean(state.forceEliteNext),
        modifiers: {
            ...defaults,
            ...Object.fromEntries(Object.entries(modifiers).filter(([key]) => key !== 'resistances').map(([key, value]) => [key, Number(value) || 0])),
            resistances: { ...defaults.resistances, ...(modifiers.resistances || {}) }
        }
    };
}

function randomOperationSpacing(random = Math.random) {
    return 1 + Math.floor(Math.min(0.999999, Math.max(0, random())) * 3);
}

function scheduleNextOperationEvent(random = Math.random) {
    if (!operationState || currentRunMode !== 'operation') return;
    const next = currentMonsterIndex + randomOperationSpacing(random);
    operationState.nextEventAt = next < operationState.encounterTarget ? next : Number.POSITIVE_INFINITY;
}

function applyCoreToOperationState(coreId, state) {
    const core = getCoreDefinition(coreId);
    if (!core) return;
    const mods = core.modifiers || {};
    for (const [key, value] of Object.entries(mods)) {
        if (key === 'resistances') continue;
        if (Object.prototype.hasOwnProperty.call(state.modifiers, key)) state.modifiers[key] += Number(value) || 0;
    }
}

function beginOperationState(location, coreId = null) {
    const state = normalizeOperationState({
        operationId: location?.operationId || null,
        operationSeed: location?.seed || null,
        guaranteedReward: location?.guaranteedReward || null,
        encounterTarget: location?.numFights || 1,
        nextEventAt: 1
    });
    if (coreId) {
        const core = getCoreDefinition(coreId);
        if (!core || !removeStackFromMap(window.coreInventory, core.id, 1)) return null;
        state.activeCoreId = core.id;
        applyCoreToOperationState(core.id, state);
        logMessage(`${core.name} consumed for this Operation.`);
    }
    operationState = state;
    currentRunMode = 'operation';
    currentMonsterIndex = 0;
    scheduleNextOperationEvent();
    refreshResourceStorageUI();
    return state;
}

function beginPatrolState() {
    operationState = null;
    currentRunMode = 'patrol';
    currentMonsterIndex = 0;
}

function getActiveOperationRewardModifiers() {
    if (currentRunMode === 'patrol') return { material: 0.72, flux: 0.72, core: 0.72, cache: 0.72 };
    if (currentRunMode !== 'operation' || !operationState) return { material: 1, flux: 1, core: 1, cache: 1 };
    const modifiers = operationState.modifiers;
    return {
        material: 1.2 + modifiers.materialFind,
        flux: 1.2 + modifiers.fluxFind,
        core: 1.15 + modifiers.coreFind,
        cache: 1.25 + modifiers.cacheFind
    };
}

function applyActiveRunPlayerModifiers(stats) {
    if (currentRunMode !== 'operation' || !operationState || !stats) return stats;
    const modifiers = operationState.modifiers;
    const completed = Math.max(0, Number(operationState.encountersCompleted) || 0);
    stats.attackSpeed = Math.min(10, Math.max(0.1, Number(stats.attackSpeed || 1) * (1 + modifiers.attackSpeedPercent)));
    stats.criticalChance = Math.min(1, Math.max(0, Number(stats.criticalChance || 0) + modifiers.criticalChance));
    stats.energyShield = Math.max(0, Math.round(Number(stats.energyShield || 0) * (1 + modifiers.energyShieldPercent)));
    stats.damageMultipliers = stats.damageMultipliers || {};
    stats.damageMultipliers.operation = Math.max(0.1, 1 + modifiers.damageMultiplier + modifiers.damagePerEncounter * completed);
    stats.damageTakenReduction = Number(stats.damageTakenReduction || 0) - modifiers.damageTaken;
    for (const [type, value] of Object.entries(modifiers.resistances || {})) {
        stats.defenseTypes[type] = Number(stats.defenseTypes[type] || 0) + Number(value || 0);
    }
    return stats;
}

function applyActiveRunEnemyModifiers(stats) {
    if (currentRunMode !== 'operation' || !operationState || !stats) return stats;
    const modifiers = operationState.modifiers;
    const completed = Math.max(0, Number(operationState.encountersCompleted) || 0);
    const multiplier = Math.max(0.1, 1 + modifiers.enemyDamageMultiplier + modifiers.enemyDamagePerEncounter * completed);
    for (const type of Object.keys(stats.damageTypes || {})) stats.damageTypes[type] *= multiplier;
    return stats;
}

function healOperationPlayer(fraction) {
    const maximum = Math.max(1, Number(player?.totalStats?.health) || 1);
    const amount = Math.max(0, Math.round(maximum * Number(fraction || 0)));
    player.currentHealth = Math.min(maximum, Math.max(0, Number(player.currentHealth) || 0) + amount);
    updatePlayerStatsDisplay();
    return amount;
}

function completeOperationEncounter() {
    if (currentRunMode !== 'operation' || !operationState) return;
    operationState.encountersCompleted = currentMonsterIndex;
    const priorMaxHealth = Math.max(1, Number(player.totalStats?.health) || 1);
    const priorHealth = Math.max(0, Number(player.currentHealth) || 0);
    player.calculateStats();
    const nextMaxHealth = Math.max(1, Number(player.totalStats?.health) || priorMaxHealth);
    player.currentHealth = Math.min(nextMaxHealth, priorHealth);
    if (operationState.modifiers.healAfterEncounter > 0) healOperationPlayer(operationState.modifiers.healAfterEncounter);
}

function shouldTriggerOperationEvent() {
    return currentRunMode === 'operation'
        && operationState
        && currentMonsterIndex < operationState.encounterTarget
        && currentMonsterIndex >= operationState.nextEventAt;
}

function closeOperationEvent() {
    document.getElementById('operation-event-overlay')?.remove();
}

function isOperationEventVisible() {
    return Boolean(document.getElementById('operation-event-overlay'));
}

function showOperationEvent(random = Math.random) {
    if (!shouldTriggerOperationEvent()) return false;
    closeOperationEvent();
    const definition = OPERATION_EVENT_DEFINITIONS[Math.floor(random() * OPERATION_EVENT_DEFINITIONS.length)] || OPERATION_EVENT_DEFINITIONS[0];
    const overlay = document.createElement('div');
    overlay.id = 'operation-event-overlay';
    overlay.className = 'operation-event-overlay';
    const card = document.createElement('section');
    card.className = 'operation-event-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.innerHTML = `<header><span>OPERATION EVENT</span><h2>${definition.title}</h2></header><p>${definition.description}</p><div class="operation-event-options"></div>`;
    const options = card.querySelector('.operation-event-options');
    definition.choices.forEach(choice => {
        const button = document.createElement('button');
        button.type = 'button';
        button.innerHTML = `<strong>${choice.label}</strong><span>${choice.detail}</span>`;
        button.addEventListener('click', () => {
            const previousMaximumShield = Math.max(0, Number(player.totalStats?.energyShield) || 0);
            const previousCurrentShield = Math.max(0, Number(player.currentShield) || 0);
            choice.apply(operationState);
            operationState.eventCount++;
            scheduleNextOperationEvent();
            closeOperationEvent();
            player.calculateStats();
            const nextMaximumShield = Math.max(0, Number(player.totalStats?.energyShield) || 0);
            player.currentShield = Math.min(
                nextMaximumShield,
                previousCurrentShield + Math.max(0, nextMaximumShield - previousMaximumShield)
            );
            updatePlayerStatsDisplay();
            logMessage(`${definition.title}: ${choice.label}.`);
            beginNextMonsterInSequence();
        });
        options.appendChild(button);
    });
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    return true;
}

function getOperationEncounterTarget() {
    const fallbackEncounterCount = typeof currentDelveLocation !== 'undefined'
        ? Number(currentDelveLocation?.numFights || 1)
        : 1;
    return currentRunMode === 'operation' && operationState
        ? operationState.encounterTarget
        : fallbackEncounterCount;
}

function clearActiveRunState() {
    currentRunMode = null;
    operationState = null;
    closeOperationEvent();
}

window.OPERATION_EVENT_DEFINITIONS = OPERATION_EVENT_DEFINITIONS;
window.OPERATION_BOARD_SIZE = OPERATION_BOARD_SIZE;
window.OPERATION_SEED_HISTORY_LIMIT = OPERATION_SEED_HISTORY_LIMIT;
window.createOperationRandom = createOperationRandom;
window.generateOperationOffer = generateOperationOffer;
window.normalizeOperationBoard = normalizeOperationBoard;
window.ensureOperationBoard = ensureOperationBoard;
window.replaceCompletedOperationOffer = replaceCompletedOperationOffer;
window.formatOperationReward = formatOperationReward;
window.recordCompletedOperationSeed = recordCompletedOperationSeed;
window.completeGeneratedOperation = completeGeneratedOperation;
window.normalizeOperationState = normalizeOperationState;
window.beginOperationState = beginOperationState;
window.beginPatrolState = beginPatrolState;
window.getActiveOperationRewardModifiers = getActiveOperationRewardModifiers;
window.applyActiveRunPlayerModifiers = applyActiveRunPlayerModifiers;
window.applyActiveRunEnemyModifiers = applyActiveRunEnemyModifiers;
window.completeOperationEncounter = completeOperationEncounter;
window.shouldTriggerOperationEvent = shouldTriggerOperationEvent;
window.showOperationEvent = showOperationEvent;
window.isOperationEventVisible = isOperationEventVisible;
window.getOperationEncounterTarget = getOperationEncounterTarget;
window.clearActiveRunState = clearActiveRunState;
