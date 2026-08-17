// Operation-only Core effects, randomized between-encounter events, and run modifiers.

const OPERATION_BOARD_VERSION = 2;
const OPERATION_BOARD_SIZE = 6;
const OPERATION_DIFFICULTY_BANDS = Object.freeze([
    'current', 'current', 'lower', 'lower', 'higher', 'higher'
]);
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
    const eligible = enemyRegistry.filter(enemy => enemy?.name && !enemy.developerOnly && !enemy.isTrainingDummy && !enemy.dynamicOperationSecurity);
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
        // Per-level ranges never overlap, so a harder Feed Operation cannot
        // display a smaller guaranteed payout than an easier one.
        return { kind: 'feed', quantity: 160 + level * 28 + Math.floor(random() * 21) };
    }
    if (rewardKind === 1) {
        const caches = (typeof CACHE_DEFINITIONS !== 'undefined' ? CACHE_DEFINITIONS : [])
            .filter(cache => !['flux', 'core'].includes(cache.id));
        const cache = caches[Math.floor(random() * caches.length)] || { id: 'kinetic', name: 'Kinetic Cache' };
        return { kind: 'cache', id: cache.id, name: cache.name, quantity: level >= 41 ? 2 : 1 };
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

function getOperationLevelForBand(playerLevel, difficultyBand, random) {
    const baseLevel = Math.max(1, Math.min(50, Math.floor(Number(playerLevel) || 1)));
    if (difficultyBand === 'lower') {
        const offset = 3 + Math.floor(random() * 4);
        return Math.max(1, baseLevel - offset);
    }
    if (difficultyBand === 'higher') {
        const offset = 3 + Math.floor(random() * 4);
        return Math.min(50, baseLevel + offset);
    }
    return baseLevel;
}

function generateOperationOffer(seed, playerLevel = Number(window.player?.level) || 1, enemyRegistry = window.enemies || [], difficultyBand = 'current') {
    const stableSeed = String(seed || createOperationSeed());
    const random = createOperationRandom(stableSeed);
    const normalizedBand = OPERATION_DIFFICULTY_BANDS.includes(difficultyBand) ? difficultyBand : 'current';
    const recommendedLevel = getOperationLevelForBand(playerLevel, normalizedBand, random);
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
        difficultyBand: normalizedBand,
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
    const playerLevel = Math.max(1, Math.min(50, Math.floor(Number(options.playerLevel ?? window.player?.level) || 1)));
    const enemyRegistry = options.enemies || window.enemies || [];
    const random = options.random || Math.random;
    const now = options.now || Date.now;
    const canPreserveOffers = Number(board.version) === OPERATION_BOARD_VERSION
        && Number(board.playerLevel) === playerLevel;
    const savedOffers = canPreserveOffers && Array.isArray(board.offers)
        ? board.offers.filter(offer => (
            offer?.generatedOperation
            && typeof offer.seed === 'string'
            && typeof offer.operationId === 'string'
            && Array.isArray(offer.enemies)
            && offer.enemies.length > 0
            && offer.guaranteedReward
        )).slice(0, OPERATION_BOARD_SIZE)
        : [];
    const offers = [];
    let generation = Math.max(0, Math.floor(Number(board.generation) || 0));
    for (let index = 0; index < OPERATION_BOARD_SIZE; index++) {
        const difficultyBand = OPERATION_DIFFICULTY_BANDS[index];
        const savedOffer = savedOffers[index];
        if (savedOffer?.difficultyBand === difficultyBand) {
            offers.push(savedOffer);
            continue;
        }
        const seed = `${createOperationSeed(random, now)}-${generation.toString(36)}-${index}`;
        offers.push(generateOperationOffer(seed, playerLevel, enemyRegistry, difficultyBand));
        generation++;
    }
    return { version: OPERATION_BOARD_VERSION, generation, playerLevel, offers };
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
    const difficultyBand = board.offers[index]?.difficultyBand || OPERATION_DIFFICULTY_BANDS[index] || 'current';
    const replacement = generateOperationOffer(
        seed,
        options.playerLevel ?? window.player?.level,
        options.enemies || window.enemies || [],
        difficultyBand
    );
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
    if (reward.kind === 'flux') {
        const quantity = Math.max(1, Math.floor(Number(reward.quantity) || 1));
        for (let index = 0; index < quantity; index++) {
            const name = getFluxNameForLevel(getOperationLevel());
            const template = (window.materials || []).find(material => material.name === name);
            addItemToDelveBag({ ...(template || { name, type: 'Material', stackable: true }), quantity: 1 });
        }
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
    for (const eventReward of operationState.completionRewards || []) stageOperationGuaranteedReward(eventReward);
    operationState.completionRewards = [];
    operationState.guaranteedRewardClaimed = true;
    recordCompletedOperationSeed(location.seed || operationState.operationSeed);
    replaceCompletedOperationOffer(location.operationId || operationState.operationId);
    return reward;
}

const OPERATION_DAMAGE_MATERIALS = Object.freeze({
    kinetic: Object.freeze(['Stabilizer', 'Advanced Barrel', 'Precision Mechanism']),
    slashing: Object.freeze(['Titanium Thorn', 'Metal Scorpion Fang', 'Enhanced Cutting Edge']),
    pyro: Object.freeze(['Flame Shell', 'Pyro Core', 'Flux Crystal']),
    cryo: Object.freeze(['Cryo Cell', 'Unstable Phase Core', 'Temporal Stabilizer']),
    electric: Object.freeze(['Copper Coil', 'High-Density Power Cell', 'Quantum Capacitor']),
    corrosive: Object.freeze(['Toxic Residue', 'Synthetic Poison Gland', 'Synthetic Biofluid']),
    radiation: Object.freeze(['Unstable Photon', 'Crystalized Light', 'Nanite Cluster'])
});
const OPERATION_DAMAGE_TYPES = Object.freeze(Object.keys(OPERATION_DAMAGE_MATERIALS));
const OPERATION_ADVANCED_MATERIAL_LEVELS = Object.freeze({
    kinetic: 11, slashing: 11, pyro: 11, electric: 11,
    cryo: 16, corrosive: 16, radiation: 16
});

function getOperationLevel() {
    return Math.max(1, Math.min(50, Math.floor(Number(currentDelveLocation?.recommendedLevel || player?.level) || 1)));
}

function getOperationMaterialPool(damageType = null, highestOnly = false) {
    const level = getOperationLevel();
    if (damageType && OPERATION_DAMAGE_MATERIALS[damageType]) {
        const family = OPERATION_DAMAGE_MATERIALS[damageType];
        const maximumIndex = level >= 31 ? 2 : level >= OPERATION_ADVANCED_MATERIAL_LEVELS[damageType] ? 1 : 0;
        return highestOnly ? [family[maximumIndex]] : family.slice(0, maximumIndex + 1);
    }
    const maximumBand = Math.max(0, Math.min(OPERATION_MATERIAL_BANDS.length - 1, Math.floor((level - 1) / 10)));
    return OPERATION_MATERIAL_BANDS.slice(0, maximumBand + 1).flat();
}

function pickOperationMaterial(damageType = null, random = Math.random, highestOnly = false) {
    const pool = getOperationMaterialPool(damageType, highestOnly);
    return pool[Math.floor(Math.min(0.999999, Math.max(0, random())) * pool.length)] || 'Scrap Metal';
}

function grantOperationMaterial(name, quantity = 1) {
    const amount = Math.max(1, Math.floor(Number(quantity) || 1));
    if (typeof addMaterialToStorage === 'function') addMaterialToStorage(name, amount);
    logMessage(`Recovered ${amount}× ${name}.`);
    return { kind: 'material', name, quantity: amount };
}

function grantRandomOperationMaterials(quantity, damageType = null, random = Math.random) {
    const rewards = [];
    for (let index = 0; index < Math.max(1, Math.floor(Number(quantity) || 1)); index++) {
        rewards.push(grantOperationMaterial(pickOperationMaterial(damageType, random), 1));
    }
    return rewards;
}

function getRandomOperationCore(random = Math.random) {
    const definitions = typeof CORE_DEFINITIONS !== 'undefined' ? CORE_DEFINITIONS : [];
    const eligible = definitions
        .filter(core => Number(core.minLevel || 1) <= getOperationLevel());
    return eligible[Math.floor(Math.min(0.999999, Math.max(0, random())) * eligible.length)] || definitions[0] || null;
}

function getRandomOperationCache(random = Math.random) {
    const definitions = typeof CACHE_DEFINITIONS !== 'undefined' ? CACHE_DEFINITIONS : [];
    const eligible = definitions
        .filter(cache => !['core', 'flux'].includes(cache.id));
    return eligible[Math.floor(Math.min(0.999999, Math.max(0, random())) * eligible.length)] || definitions[0] || null;
}

function grantOperationCore(random = Math.random) {
    const core = getRandomOperationCore(random);
    if (core && typeof addCoreToStorage === 'function') addCoreToStorage(core.id, 1);
    if (core) logMessage(`Recovered ${core.name}.`);
    return core;
}

function grantOperationCache(random = Math.random) {
    const cache = getRandomOperationCache(random);
    if (cache && typeof addCacheToStorage === 'function') addCacheToStorage(cache.id, 1);
    if (cache) logMessage(`Recovered ${cache.name}.`);
    return cache;
}

function grantOperationFlux(quantity = 1, random = Math.random) {
    const rewards = [];
    for (let index = 0; index < Math.max(1, Math.floor(Number(quantity) || 1)); index++) {
        const name = getFluxNameForLevel(getOperationLevel(), random);
        rewards.push(grantOperationMaterial(name, 1));
    }
    return rewards;
}

function grantOperationFeed(quantity) {
    const amount = Math.max(1, Math.floor(Number(quantity) || 1));
    if (typeof updateFeed === 'function') updateFeed(amount);
    else playerFeed += amount;
    logMessage(`Recovered ${amount} Feed.`);
    return amount;
}

function queueOperationCompletionReward(state, reward) {
    if (reward) state.completionRewards.push(reward);
}

function addOperationTemporaryEffect(state, encounters, playerModifiers = {}, enemyModifiers = {}) {
    state.temporaryEffects.push({
        remainingEncounters: Math.max(1, Math.floor(Number(encounters) || 1)),
        playerModifiers: { ...playerModifiers },
        enemyModifiers: { ...enemyModifiers }
    });
}

function queueOperationEncounterModifier(state, modifier = {}) {
    state.encounterModifiers.push({ ...modifier });
}

function queueAdditionalOperationEncounter(state, modifier = {}) {
    state.encounterTarget += 1;
    state.queuedEncounters.push({ ...modifier });
}

function queueOperationBonusEvent(state, random = Math.random) {
    const remaining = Math.max(1, state.encounterTarget - currentMonsterIndex - 1);
    const offset = Math.min(remaining, 1 + Math.floor(Math.min(0.999999, Math.max(0, random())) * Math.min(2, remaining)));
    state.bonusEventsAt.push(currentMonsterIndex + offset);
}

function loseOperationHealth(fraction, maximumBased = true) {
    const basis = maximumBased
        ? Math.max(1, Number(player?.totalStats?.health) || 1)
        : Math.max(0, Number(player?.currentHealth) || 0);
    const amount = Math.max(0, Math.round(basis * Math.max(0, Number(fraction) || 0)));
    player.currentHealth = Math.max(0, Number(player.currentHealth) - amount);
    updatePlayerStatsDisplay();
    return amount;
}

function addScaledFeedCompletionReward(state, multiplier = 1) {
    queueOperationCompletionReward(state, {
        kind: 'feed',
        quantity: Math.max(30, Math.round((80 + getOperationLevel() * 18) * multiplier))
    });
}

function addMaterialBundleCompletionReward(state, quantity = 6, damageType = null, random = Math.random) {
    const grouped = {};
    for (let index = 0; index < quantity; index++) {
        const name = pickOperationMaterial(damageType, random);
        grouped[name] = (grouped[name] || 0) + 1;
    }
    queueOperationCompletionReward(state, {
        kind: 'materialBundle',
        items: Object.entries(grouped).map(([name, itemQuantity]) => ({ name, quantity: itemQuantity }))
    });
}

function chooseOperationDamageType(onChoose) {
    return {
        deferred: true,
        mount(container, finish) {
            container.replaceChildren();
            container.classList.add('operation-damage-type-picker');
            for (const type of OPERATION_DAMAGE_TYPES) {
                const button = document.createElement('button');
                button.type = 'button';
                button.innerHTML = `<strong>${type.charAt(0).toUpperCase()}${type.slice(1)}</strong><span>Claim the highest available ${type} material.</span>`;
                button.addEventListener('click', () => {
                    onChoose(type);
                    finish();
                }, { once: true });
                container.appendChild(button);
            }
        }
    };
}

function eventChoice(label, detail, apply) {
    return Object.freeze({ label, detail, apply: apply || (() => {}) });
}

function operationEvent(id, title, description, choices) {
    return Object.freeze({ id, title, description, choices: Object.freeze(choices) });
}

const OPERATION_EVENT_DEFINITIONS = Object.freeze([
    operationEvent('sealed-security-door', 'Sealed Security Door', 'A reinforced security door blocks a sealed recovery room.', [
        eventChoice('Break down the door', 'Fight an additional security encounter. Victory grants a random Core.', state => queueAdditionalOperationEncounter(state, { kind: 'security', reward: { kind: 'core' } })),
        eventChoice('Attempt an override', '50% chance to gain a random Core. Failure costs 40% maximum Health.', (state, random) => random() < 0.5 ? grantOperationCore(random) : loseOperationHealth(0.4)),
        eventChoice('Leave', 'Gain and risk nothing.')
    ]),
    operationEvent('mass-driver-wreckage', 'Mass-Driver Wreckage', 'A shattered kinetic weapons platform still contains usable components.', [
        eventChoice('Mark the heavy components', '+1 Kinetic material reward upon Operation completion.', (state, random) => queueOperationCompletionReward(state, { kind: 'material', name: pickOperationMaterial('kinetic', random), quantity: 1 })),
        eventChoice('Retune the salvage scanners', '+35% Kinetic material drops for the remainder of the Operation.', state => { state.modifiers.materialFindByType.kinetic += 0.35; }),
        eventChoice('Pry open the feed tray', '60% chance to gain 6 Kinetic materials. Failure empowers enemy damage for the next encounter.', (state, random) => random() < 0.6 ? grantRandomOperationMaterials(6, 'kinetic', random) : addOperationTemporaryEffect(state, 1, {}, { damageMultiplier: 0.25 }))
    ]),
    operationEvent('autonomous-butcher-array', 'Autonomous Butcher Array', 'A dormant cutter line can be stripped or redirected.', [
        eventChoice('Strip the cutting heads', '+1 Slashing material reward upon Operation completion.', (state, random) => queueOperationCompletionReward(state, { kind: 'material', name: pickOperationMaterial('slashing', random), quantity: 1 })),
        eventChoice('Redirect its harvest routine', '+35% Slashing material drops for the remainder of the Operation.', state => { state.modifiers.materialFindByType.slashing += 0.35; }),
        eventChoice('Calibrate your weapon', '+15% Slashing final damage for the remainder of the Operation.', state => { state.modifiers.damageTypeFinal.slashing += 0.15; })
    ]),
    operationEvent('contained-furnace', 'Contained Furnace', 'A sealed furnace holds a pocket of refined thermal matter.', [
        eventChoice('Drain the crucible', 'Gain 5 Pyro materials.', (state, random) => grantRandomOperationMaterials(5, 'pyro', random)),
        eventChoice('Reserve the thermal stock', '+1 Pyro material reward upon Operation completion.', (state, random) => queueOperationCompletionReward(state, { kind: 'material', name: pickOperationMaterial('pyro', random), quantity: 1 })),
        eventChoice('Route heat into your weapon', '+12% final damage for the next 3 encounters.', state => addOperationTemporaryEffect(state, 3, { damageMultiplier: 0.12 }))
    ]),
    operationEvent('cryogenic-preservation-vault', 'Cryogenic Preservation Vault', 'Intact cryogenic cells remain locked inside a preservation rack.', [
        eventChoice('Open the nearest rack', 'Gain 5 Cryo materials.', (state, random) => grantRandomOperationMaterials(5, 'cryo', random)),
        eventChoice('Tag the deep storage', '+2 Cryo material rewards upon Operation completion.', (state, random) => {
            queueOperationCompletionReward(state, { kind: 'material', name: pickOperationMaterial('cryo', random), quantity: 1 });
            queueOperationCompletionReward(state, { kind: 'material', name: pickOperationMaterial('cryo', random), quantity: 1 });
        }),
        eventChoice('Vent the coolant', '+20 Elemental Resistance for the remainder of the Operation.', state => { state.modifiers.resistances.elementalResistance += 20; })
    ]),
    operationEvent('arc-distribution-relay', 'Arc Distribution Relay', 'A live relay spits controlled arcs across the corridor.', [
        eventChoice('Salvage the relay', '+1 Electric material reward upon Operation completion.', (state, random) => queueOperationCompletionReward(state, { kind: 'material', name: pickOperationMaterial('electric', random), quantity: 1 })),
        eventChoice('Overclock your actuators', '+12% Attack Speed for the remainder of the Operation.', state => { state.modifiers.attackSpeedPercent += 0.12; }),
        eventChoice('Ground the main bus', '50% chance to gain 8 Electric materials. Failure removes Energy Shield and costs 15% maximum Health.', (state, random) => {
            if (random() < 0.5) grantRandomOperationMaterials(8, 'electric', random);
            else { player.currentShield = 0; loseOperationHealth(0.15); }
        })
    ]),
    operationEvent('chemical-reclamation-vats', 'Chemical Reclamation Vats', 'A row of reclamation vats bubbles behind cracked safety glass.', [
        eventChoice('Tap the nearest vat', 'Gain 6 Corrosive materials.', (state, random) => grantRandomOperationMaterials(6, 'corrosive', random)),
        eventChoice('Prime the recovery pumps', '+40% Corrosive material drops for the remainder of the Operation.', state => { state.modifiers.materialFindByType.corrosive += 0.4; }),
        eventChoice('Coat your delivery system', '+20% status chance and +30% status duration for the remainder of the Operation.', state => { state.modifiers.debuffChanceBonus += 0.2; state.modifiers.debuffDurationBonus += 0.3; })
    ]),
    operationEvent('isotope-containment-shrine', 'Isotope Containment Shrine', 'A containment shrine hums around a stable isotope vessel.', [
        eventChoice('Claim the isotope', '+1 Radiation material reward upon Operation completion.', (state, random) => queueOperationCompletionReward(state, { kind: 'material', name: pickOperationMaterial('radiation', random), quantity: 1 })),
        eventChoice('Tune the recovery field', '+40% Radiation material drops for the remainder of the Operation.', state => { state.modifiers.materialFindByType.radiation += 0.4; }),
        eventChoice('Accept the irradiation', '+10% final damage and +10% Critical Chance for the next 2 encounters.', state => addOperationTemporaryEffect(state, 2, { damageMultiplier: 0.1, criticalChance: 0.1 }))
    ]),
    operationEvent('universal-salvage-sorter', 'Universal Salvage Sorter', 'A broad-spectrum sorter is still identifying viable salvage.', [
        eventChoice('Reserve two bins', '+2 random material rewards upon Operation completion.', (state, random) => {
            queueOperationCompletionReward(state, { kind: 'material', name: pickOperationMaterial(null, random), quantity: 1 });
            queueOperationCompletionReward(state, { kind: 'material', name: pickOperationMaterial(null, random), quantity: 1 });
        }),
        eventChoice('Keep the sorter online', '+25% material drops for the remainder of the Operation.', state => { state.modifiers.materialFind += 0.25; }),
        eventChoice('Force the output gate', '50% chance to gain 10 random materials.', (state, random) => { if (random() < 0.5) grantRandomOperationMaterials(10, null, random); })
    ]),
    operationEvent('core-containment-vault', 'Core Containment Vault', 'A compact vault reports one unstable Core signature.', [
        eventChoice('Tag it for extraction', '+1 random Core reward upon Operation completion.', (state, random) => {
            const core = getRandomOperationCore(random);
            if (core) queueOperationCompletionReward(state, { kind: 'core', id: core.id, name: core.name, quantity: 1 });
        }),
        eventChoice('Search for more signatures', '+40% Core drop chance for the remainder of the Operation.', state => { state.modifiers.coreFind += 0.4; }),
        eventChoice('Crack the seal', '40% chance to gain a random Core. Failure grants enemies +15% Attack Speed for the next 2 encounters.', (state, random) => random() < 0.4 ? grantOperationCore(random) : addOperationTemporaryEffect(state, 2, {}, { attackSpeedPercent: 0.15 }))
    ]),
    operationEvent('misrouted-cache-shipment', 'Misrouted Cache Shipment', 'A cargo system has routed an unclaimed Cache into the sector.', [
        eventChoice('Redirect it to extraction', '+1 random Cache reward upon Operation completion.', (state, random) => {
            const cache = getRandomOperationCache(random);
            if (cache) queueOperationCompletionReward(state, { kind: 'cache', id: cache.id, name: cache.name, quantity: 1 });
        }),
        eventChoice('Trace the shipment network', '+35% Cache drop chance for the remainder of the Operation.', state => { state.modifiers.cacheFind += 0.35; }),
        eventChoice('Force immediate delivery', '50% chance to gain a random Cache. Failure triggers an empowered security encounter; victory still grants the Cache.', (state, random) => random() < 0.5 ? grantOperationCache(random) : queueAdditionalOperationEncounter(state, { kind: 'security', empoweredLeader: true, reward: { kind: 'cache' } }))
    ]),
    operationEvent('condensed-flux-growth', 'Condensed Flux Growth', 'A crystalline Flux growth pulses against the bulkhead.', [
        eventChoice('Mark it for extraction', '+1 Flux reward upon Operation completion.', state => queueOperationCompletionReward(state, { kind: 'flux', quantity: 1 })),
        eventChoice('Seed the route', '+40% Flux drop chance for the remainder of the Operation.', state => { state.modifiers.fluxFind += 0.4; }),
        eventChoice('Break it free', '50% chance to gain 2 Flux. Failure removes Energy Shield and costs 20% maximum Health.', (state, random) => {
            if (random() < 0.5) grantOperationFlux(2, random);
            else { player.currentShield = 0; loseOperationHealth(0.2); }
        })
    ]),
    operationEvent('feed-compression-reservoir', 'Feed Compression Reservoir', 'A pressure reservoir contains concentrated Feed.', [
        eventChoice('Route it to extraction', 'Gain an additional Feed reward upon Operation completion.', state => addScaledFeedCompletionReward(state, 1)),
        eventChoice('Prime collection systems', '+30% Feed drops for the remainder of the Operation.', state => { state.modifiers.feedFind += 0.3; }),
        eventChoice('Vent it now', '70% chance to gain a doubled Feed payout.', (state, random) => { if (random() < 0.7) grantOperationFeed(Math.round((80 + getOperationLevel() * 18) * 2)); })
    ]),
    operationEvent('quartermasters-final-manifest', "Quartermaster's Final Manifest", 'A dead quartermaster left three recoverable manifests.', [
        eventChoice('Material manifest', 'Gain a large material bundle upon Operation completion.', (state, random) => addMaterialBundleCompletionReward(state, 10, null, random)),
        eventChoice('Cache manifest', 'Gain a random Cache upon Operation completion.', (state, random) => {
            const cache = getRandomOperationCache(random);
            if (cache) queueOperationCompletionReward(state, { kind: 'cache', id: cache.id, name: cache.name, quantity: 1 });
        }),
        eventChoice('Core manifest', 'Gain a random Core upon Operation completion.', (state, random) => {
            const core = getRandomOperationCore(random);
            if (core) queueOperationCompletionReward(state, { kind: 'core', id: core.id, name: core.name, quantity: 1 });
        })
    ]),
    operationEvent('combat-calibration-console', 'Combat Calibration Console', 'A calibration console offers one permanent combat profile.', [
        eventChoice('Power calibration', '+10% final damage for the remainder of the Operation.', state => { state.modifiers.damageMultiplier += 0.1; }),
        eventChoice('Speed calibration', '+12% Attack Speed for the remainder of the Operation.', state => { state.modifiers.attackSpeedPercent += 0.12; }),
        eventChoice('Precision calibration', '+8% Critical Chance for the remainder of the Operation.', state => { state.modifiers.criticalChance += 0.08; })
    ]),
    operationEvent('mobile-defense-lattice', 'Mobile Defense Lattice', 'A portable defense lattice can reinforce one survival layer.', [
        eventChoice('Reinforce Health', '+15% maximum Health and heal the added amount.', state => { state.modifiers.healthPercent += 0.15; state.pendingHealthGainPercent += 0.15; }),
        eventChoice('Reinforce Energy Shield', '+25% maximum Energy Shield and fill the added amount.', state => { state.modifiers.energyShieldPercent += 0.25; }),
        eventChoice('Reinforce mitigation', 'Take 10% less damage for the remainder of the Operation.', state => { state.modifiers.damageTakenReduction += 0.1; })
    ]),
    operationEvent('medical-nanite-mist', 'Medical Nanite Mist', 'A cloud of medical nanites waits for a treatment directive.', [
        eventChoice('Immediate reconstruction', 'Restore all Health.', () => healOperationPlayer(1)),
        eventChoice('Sustained repair', 'Regenerate 1.5% maximum Health per second for the remainder of the Operation.', state => { state.modifiers.healthRegenPercent += 0.015; }),
        eventChoice('Structural treatment', 'Restore 25% Health and gain +12% maximum Health for the remainder of the Operation.', state => { healOperationPlayer(0.25); state.modifiers.healthPercent += 0.12; state.pendingHealthGainPercent += 0.12; })
    ]),
    operationEvent('reflex-sequencer', 'Reflex Sequencer', 'A motion sequencer offers one combat-response routine.', [
        eventChoice('Accelerate', '+15% Attack Speed for the remainder of the Operation.', state => { state.modifiers.attackSpeedPercent += 0.15; }),
        eventChoice('Chain', '+20% combo chance for the remainder of the Operation.', state => { state.modifiers.comboAttack += 20; }),
        eventChoice('Amplify', '+30% combo effectiveness for the remainder of the Operation.', state => { state.modifiers.comboEffectiveness += 30; })
    ]),
    operationEvent('weapon-resonance-chamber', 'Weapon Resonance Chamber', 'The chamber can tune one part of your weapon profile.', [
        eventChoice('Resonate the dominant damage type', '+15% final damage for your dominant damage type.', state => { state.modifiers.dominantDamageFinal += 0.15; }),
        eventChoice('Piercing resonance', '+20 Armor Penetration for the remainder of the Operation.', state => { state.modifiers.armorPenetration += 20; }),
        eventChoice('Stable resonance', '+12% minimum damage roll for the remainder of the Operation.', state => { state.modifiers.damageRollFloorBonus += 0.12; })
    ]),
    operationEvent('reactive-defense-network', 'Reactive Defense Network', 'A reactive network can be assigned to one defense channel.', [
        eventChoice('Evasion protocol', '+20 Deflection for the remainder of the Operation.', state => { state.modifiers.deflection += 20; }),
        eventChoice('Purification protocol', '+20% status resistance and 25% shorter hostile effects.', state => { state.modifiers.statusResistance += 0.2; state.modifiers.statusDurationReduction += 0.25; }),
        eventChoice('Adaptive protocol', '+20 to your lowest Resistance for the remainder of the Operation.', state => { state.modifiers.lowestResistance += 20; })
    ]),
    operationEvent('salvage-nanite-swarm', 'Salvage Nanite Swarm', 'A salvage swarm awaits a resource-priority directive.', [
        eventChoice('Prioritize materials', '+30% material drops for the remainder of the Operation.', state => { state.modifiers.materialFind += 0.3; }),
        eventChoice('Prioritize Feed', '+40% Feed drops for the remainder of the Operation.', state => { state.modifiers.feedFind += 0.4; }),
        eventChoice('Prioritize rare resources', '+20% Core, Cache, and Flux drops for the remainder of the Operation.', state => { state.modifiers.coreFind += 0.2; state.modifiers.cacheFind += 0.2; state.modifiers.fluxFind += 0.2; })
    ]),
    operationEvent('elite-bounty-transmission', 'Elite Bounty Transmission', 'A live bounty has identified hardened targets along the route.', [
        eventChoice('Single-target bounty', 'The next encounter is empowered. Victory grants a random Cache.', state => queueOperationEncounterModifier(state, { empoweredLeader: true, reward: { kind: 'cache' } })),
        eventChoice('Twin-target bounty', 'The next 2 encounters each gain an empowered enemy. Completing both adds a Core reward.', (state, random) => {
            const bountyId = `twin-${state.eventCount}-${currentMonsterIndex}`;
            const core = getRandomOperationCore(random);
            state.pendingBounties[bountyId] = { remaining: 2, reward: core ? { kind: 'core', id: core.id, name: core.name, quantity: 1 } : null };
            queueOperationEncounterModifier(state, { extraEmpowered: 1, bountyId });
            queueOperationEncounterModifier(state, { extraEmpowered: 1, bountyId });
        }),
        eventChoice('Open season', 'Empowered enemies gain +50% loot for the remainder of the Operation.', state => { state.modifiers.empoweredLoot += 0.5; })
    ]),
    operationEvent('emergency-resource-dispenser', 'Emergency Resource Dispenser', 'A damaged dispenser still recognizes three emergency requests.', [
        eventChoice('Request a Core', '40% chance to gain a random Core. Otherwise gain Feed.', (state, random) => random() < 0.4 ? grantOperationCore(random) : grantOperationFeed(60 + getOperationLevel() * 12)),
        eventChoice('Request a Cache', '60% chance to gain a random Cache. Otherwise gain 4 random materials.', (state, random) => random() < 0.6 ? grantOperationCache(random) : grantRandomOperationMaterials(4, null, random)),
        eventChoice('Request Flux', '50% chance to gain Flux. Otherwise gain 2 random materials.', (state, random) => random() < 0.5 ? grantOperationFlux(1, random) : grantRandomOperationMaterials(2, null, random))
    ]),
    operationEvent('sudden-decompression', 'Sudden Decompression', 'A hull rupture leaves no clean route forward.', [
        eventChoice('Brace through it', 'Lose 30% of current Health.', () => loseOperationHealth(0.3, false)),
        eventChoice('Seal the combat lane', 'Enemies deal +15% damage in the next encounter.', state => addOperationTemporaryEffect(state, 1, {}, { damageMultiplier: 0.15 })),
        eventChoice('Risk the failing bulkhead', '60% chance to avoid the penalty. Failure costs 50% maximum Health.', (state, random) => { if (random() >= 0.6) loseOperationHealth(0.5); })
    ]),
    operationEvent('systemwide-quarantine', 'Systemwide Quarantine', 'A quarantine protocol locks down every nearby system.', [
        eventChoice('Divert weapon power', '-12% final damage for the next 2 encounters.', state => addOperationTemporaryEffect(state, 2, { damageMultiplier: -0.12 })),
        eventChoice('Release the containment locks', 'Enemies gain +20% maximum Health for the next 2 encounters.', state => addOperationTemporaryEffect(state, 2, {}, { healthPercent: 0.2 })),
        eventChoice('Spoof the protocol', '50% chance to clear it. Failure applies both penalties for the remainder of the Operation.', (state, random) => {
            if (random() >= 0.5) { state.modifiers.damageMultiplier -= 0.12; state.modifiers.enemyHealthMultiplier += 0.2; }
        })
    ]),
    operationEvent('reactor-instability', 'Reactor Instability', 'The sector reactor is shedding lethal waves into the route.', [
        eventChoice('Absorb the pulse', 'Lose 30% maximum Health.', () => loseOperationHealth(0.3)),
        eventChoice('Vent it into the grid', 'Enemies deal +10% final damage for the remainder of the Operation.', state => { state.modifiers.enemyDamageMultiplier += 0.1; }),
        eventChoice('Stabilize the core', '50% chance to gain 6 Radiation materials and restore 25% Health. Failure costs 60% maximum Health.', (state, random) => {
            if (random() < 0.5) { grantRandomOperationMaterials(6, 'radiation', random); healOperationPlayer(0.25); }
            else loseOperationHealth(0.6);
        })
    ]),
    operationEvent('corrupted-navigation-core', 'Corrupted Navigation Core', 'A corrupted route map offers three unreliable paths.', [
        eventChoice('Take the long route', 'Add 1 encounter with no additional reward.', state => queueAdditionalOperationEncounter(state)),
        eventChoice('Take the hostile route', 'Enemies gain +15% Health and damage for the next 3 encounters.', state => addOperationTemporaryEffect(state, 3, {}, { healthPercent: 0.15, damageMultiplier: 0.15 })),
        eventChoice('Repair the route', '60% chance to clear it. Failure adds 2 encounters with an empowered leader in each.', (state, random) => {
            if (random() >= 0.6) {
                queueAdditionalOperationEncounter(state, { empoweredLeader: true });
                queueAdditionalOperationEncounter(state, { empoweredLeader: true });
            }
        })
    ]),
    operationEvent('temporal-salvage-echo', 'Temporal Salvage Echo', 'A temporal echo can repeat one category of recovered matter.', [
        eventChoice('Echo materials', 'Duplicate the next 3 material drops.', state => { state.dropDuplication.material += 3; }),
        eventChoice('Echo Feed', 'Duplicate the next 3 Feed drops.', state => { state.dropDuplication.feed += 3; }),
        eventChoice('Echo Cores', 'Duplicate the next 3 Core drops.', state => { state.dropDuplication.core += 3; })
    ]),
    operationEvent('forked-operation-route', 'Forked Operation Route', 'The route forks around a dense hostile sector.', [
        eventChoice('Take the shortcut', 'Remove 1 encounter without reducing guaranteed rewards.', state => { state.encounterTarget = Math.max(currentMonsterIndex + 1, state.encounterTarget - 1); }),
        eventChoice('Take the guarded route', 'Add 1 empowered encounter and a Cache reward upon completion.', (state, random) => {
            queueAdditionalOperationEncounter(state, { empoweredLeader: true });
            const cache = getRandomOperationCache(random);
            if (cache) queueOperationCompletionReward(state, { kind: 'cache', id: cache.id, name: cache.name, quantity: 1 });
        }),
        eventChoice('Survey both routes', 'Keep the encounter count and guarantee one additional event.', (state, random) => queueOperationBonusEvent(state, random))
    ]),
    operationEvent('deep-sector-claim-beacon', 'Deep-Sector Claim Beacon', 'A claim beacon can reserve one recovery right.', [
        eventChoice('Claim a damage material', 'Choose a damage type and add its highest available material to the completion reward.', (state, random) => chooseOperationDamageType(type => queueOperationCompletionReward(state, { kind: 'material', name: pickOperationMaterial(type, random, true), quantity: 1 }))),
        eventChoice('Claim rare resources', 'Add a random Core, a random Cache, and Flux to the completion reward.', (state, random) => {
            const core = getRandomOperationCore(random);
            const cache = getRandomOperationCache(random);
            if (core) queueOperationCompletionReward(state, { kind: 'core', id: core.id, name: core.name, quantity: 1 });
            if (cache) queueOperationCompletionReward(state, { kind: 'cache', id: cache.id, name: cache.name, quantity: 1 });
            queueOperationCompletionReward(state, { kind: 'flux', quantity: 1 });
        }),
        eventChoice('Claim deeper access', 'Guarantee a bonus event within the next 2 encounters.', (state, random) => queueOperationBonusEvent(state, random))
    ]),
    operationEvent('priority-target-transponder', 'Priority Target Transponder', 'A transponder can tag one extra empowered target in the next encounter.', [
        eventChoice('Core bounty', 'Add an empowered enemy to the next encounter. Victory grants a random Core.', state => queueOperationEncounterModifier(state, { extraEmpowered: 1, reward: { kind: 'core' } })),
        eventChoice('Flux bounty', 'Add an empowered enemy to the next encounter. Victory grants Flux.', state => queueOperationEncounterModifier(state, { extraEmpowered: 1, reward: { kind: 'flux' } })),
        eventChoice('Material bounty', 'Add an empowered enemy to the next encounter. Victory grants a random damage material.', state => queueOperationEncounterModifier(state, { extraEmpowered: 1, reward: { kind: 'damageMaterial' } }))
    ]),
    operationEvent('derelict-exchange-terminal', 'Derelict Exchange Terminal', 'A derelict exchange terminal still accepts Feed.', [
        eventChoice('Purchase a material shipment', 'Spend Feed to gain a large material bundle.', (state, random) => {
            const cost = 80 + getOperationLevel() * 8;
            if (playerFeed >= cost) { updateFeed(-cost); grantRandomOperationMaterials(10, null, random); }
            else logMessage('Insufficient Feed.');
        }),
        eventChoice('Purchase a Core', 'Spend more Feed to gain a random Core.', (state, random) => {
            const cost = 160 + getOperationLevel() * 14;
            if (playerFeed >= cost) { updateFeed(-cost); grantOperationCore(random); }
            else logMessage('Insufficient Feed.');
        }),
        eventChoice('Authorize salvage payments', '+35% Feed from enemies for the remainder of the Operation.', state => { state.modifiers.feedFind += 0.35; })
    ]),
    operationEvent('ecosystem-scanner', 'Ecosystem Scanner', 'The scanner can bias the next hostile signal toward one ecosystem.', [
        eventChoice('Scan Physical signatures', 'The next encounter favors Physical enemies and greatly increases Physical material drops.', state => queueOperationEncounterModifier(state, { enemyGroup: 'physical', materialGroup: 'physical', lootChanceMultiplier: 1.75 })),
        eventChoice('Scan Elemental signatures', 'The next encounter favors Elemental enemies and greatly increases Elemental material drops.', state => queueOperationEncounterModifier(state, { enemyGroup: 'elemental', materialGroup: 'elemental', lootChanceMultiplier: 1.75 })),
        eventChoice('Scan Chemical signatures', 'The next encounter favors Chemical enemies and greatly increases Chemical material drops.', state => queueOperationEncounterModifier(state, { enemyGroup: 'chemical', materialGroup: 'chemical', lootChanceMultiplier: 1.75 }))
    ]),
    operationEvent('unstable-object', 'Unstable Object in the Operation Bag', 'A recovered object is trying to copy nearby matter.', [
        eventChoice('Expose it to materials', 'Double one random material stack in the Operation Bag.', (state, random) => {
            const materialsInBag = delveBag.items.filter(item => String(item.type || '').toLowerCase() === 'material');
            const selected = materialsInBag[Math.floor(random() * materialsInBag.length)];
            if (selected) selected.quantity = Math.max(1, Number(selected.quantity) || 1) * 2;
        }),
        eventChoice('Stabilize it as Flux', 'Add 2 Flux rewards upon Operation completion.', state => {
            queueOperationCompletionReward(state, { kind: 'flux', quantity: 1 });
            queueOperationCompletionReward(state, { kind: 'flux', quantity: 1 });
        }),
        eventChoice('Force both reactions', '50% chance to double a material stack and add 2 Flux rewards.', (state, random) => {
            if (random() >= 0.5) return;
            const materialsInBag = delveBag.items.filter(item => String(item.type || '').toLowerCase() === 'material');
            const selected = materialsInBag[Math.floor(random() * materialsInBag.length)];
            if (selected) selected.quantity = Math.max(1, Number(selected.quantity) || 1) * 2;
            queueOperationCompletionReward(state, { kind: 'flux', quantity: 1 });
            queueOperationCompletionReward(state, { kind: 'flux', quantity: 1 });
        })
    ]),
    operationEvent('emergency-survival-protocol', 'Emergency Survival Protocol', 'A one-use survival routine can be bound to your combat shell.', [
        eventChoice('Medical safeguard', 'The first lethal hit leaves you at 1 Health and then heals you to 30% Health.', state => { state.survivalProtocol = 'health'; }),
        eventChoice('Shield safeguard', 'The first lethal hit leaves you at 1 Health and restores 50% Energy Shield.', state => { state.survivalProtocol = 'shield'; }),
        eventChoice('Dismantle the system', 'Gain 4 random Flux materials.', (state, random) => grantOperationFlux(4, random))
    ])
]);

function createEmptyOperationModifiers() {
    return {
        attackSpeedPercent: 0,
        criticalChance: 0,
        healthPercent: 0,
        energyShieldPercent: 0,
        damageMultiplier: 0,
        damageTaken: 0,
        damageTakenReduction: 0,
        enemyDamageMultiplier: 0,
        enemyHealthMultiplier: 0,
        materialFind: 0,
        feedFind: 0,
        fluxFind: 0,
        coreFind: 0,
        cacheFind: 0,
        empoweredLoot: 0,
        healAfterEncounter: 0,
        healthRegenPercent: 0,
        damagePerEncounter: 0,
        enemyDamagePerEncounter: 0,
        debuffChanceBonus: 0,
        debuffDurationBonus: 0,
        comboAttack: 0,
        comboEffectiveness: 0,
        dominantDamageFinal: 0,
        armorPenetration: 0,
        damageRollFloorBonus: 0,
        deflection: 0,
        statusResistance: 0,
        statusDurationReduction: 0,
        lowestResistance: 0,
        damageTypeFinal: Object.fromEntries(OPERATION_DAMAGE_TYPES.map(type => [type, 0])),
        materialFindByType: Object.fromEntries(OPERATION_DAMAGE_TYPES.map(type => [type, 0])),
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
        completionRewards: Array.isArray(state.completionRewards) ? state.completionRewards.filter(Boolean) : [],
        temporaryEffects: Array.isArray(state.temporaryEffects) ? state.temporaryEffects.filter(effect => Number(effect?.remainingEncounters) > 0) : [],
        encounterModifiers: Array.isArray(state.encounterModifiers) ? state.encounterModifiers.filter(Boolean) : [],
        queuedEncounters: Array.isArray(state.queuedEncounters) ? state.queuedEncounters.filter(Boolean) : [],
        bonusEventsAt: Array.isArray(state.bonusEventsAt)
            ? state.bonusEventsAt.map(Number).filter(Number.isFinite)
            : [],
        dropDuplication: {
            material: Math.max(0, Math.floor(Number(state.dropDuplication?.material) || 0)),
            feed: Math.max(0, Math.floor(Number(state.dropDuplication?.feed) || 0)),
            core: Math.max(0, Math.floor(Number(state.dropDuplication?.core) || 0))
        },
        pendingBounties: state.pendingBounties && typeof state.pendingBounties === 'object' && !Array.isArray(state.pendingBounties)
            ? state.pendingBounties
            : {},
        activeEncounterMeta: state.activeEncounterMeta && typeof state.activeEncounterMeta === 'object'
            ? state.activeEncounterMeta
            : null,
        survivalProtocol: ['health', 'shield'].includes(state.survivalProtocol) ? state.survivalProtocol : null,
        usedEventIds: Array.isArray(state.usedEventIds) ? state.usedEventIds.filter(id => typeof id === 'string') : [],
        pendingHealthGainPercent: Math.max(0, Number(state.pendingHealthGainPercent) || 0),
        modifiers: {
            ...defaults,
            ...Object.fromEntries(Object.entries(modifiers)
                .filter(([key]) => !['resistances', 'damageTypeFinal', 'materialFindByType'].includes(key))
                .map(([key, value]) => [key, Number(value) || 0])),
            damageTypeFinal: { ...defaults.damageTypeFinal, ...(modifiers.damageTypeFinal || {}) },
            materialFindByType: { ...defaults.materialFindByType, ...(modifiers.materialFindByType || {}) },
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
    if (currentRunMode === 'patrol') return { material: 0.72, feed: 0.72, flux: 0.72, core: 0.72, cache: 0.72 };
    if (currentRunMode !== 'operation' || !operationState) return { material: 1, feed: 1, flux: 1, core: 1, cache: 1 };
    const modifiers = operationState.modifiers;
    return {
        material: 1.2 + modifiers.materialFind,
        feed: 1 + modifiers.feedFind,
        flux: 1.2 + modifiers.fluxFind,
        core: 1.15 + modifiers.coreFind,
        cache: 1.25 + modifiers.cacheFind
    };
}

function getActiveOperationTemporaryModifiers(scope) {
    const combined = {};
    for (const effect of operationState?.temporaryEffects || []) {
        const source = scope === 'enemy' ? effect.enemyModifiers : effect.playerModifiers;
        for (const [key, value] of Object.entries(source || {})) combined[key] = Number(combined[key] || 0) + Number(value || 0);
    }
    return combined;
}

function applyActiveRunPlayerModifiers(stats) {
    if (currentRunMode !== 'operation' || !operationState || !stats) return stats;
    const modifiers = operationState.modifiers;
    const temporary = getActiveOperationTemporaryModifiers('player');
    const completed = Math.max(0, Number(operationState.encountersCompleted) || 0);
    stats.health = Math.max(1, Math.round(Number(stats.health || 1) * (1 + modifiers.healthPercent + Number(temporary.healthPercent || 0))));
    stats.attackSpeed = Math.min(10, Math.max(0.1, Number(stats.attackSpeed || 1) * (1 + modifiers.attackSpeedPercent + Number(temporary.attackSpeedPercent || 0))));
    stats.criticalChance = Math.min(1, Math.max(0, Number(stats.criticalChance || 0) + modifiers.criticalChance + Number(temporary.criticalChance || 0)));
    stats.energyShield = Math.max(0, Math.round(Number(stats.energyShield || 0) * (1 + modifiers.energyShieldPercent)));
    stats.damageMultipliers = stats.damageMultipliers || {};
    stats.damageMultipliers.operation = Math.max(0.1, 1 + modifiers.damageMultiplier + Number(temporary.damageMultiplier || 0) + modifiers.damagePerEncounter * completed);
    stats.damageTakenReduction = Number(stats.damageTakenReduction || 0) - modifiers.damageTaken + modifiers.damageTakenReduction;
    stats.armorPenetration = Number(stats.armorPenetration || 0) + modifiers.armorPenetration;
    stats.damageRollFloorBonus = Number(stats.damageRollFloorBonus || 0) + modifiers.damageRollFloorBonus;
    stats.deflection = Number(stats.deflection || 0) + modifiers.deflection;
    stats.statusResistance = Number(stats.statusResistance || 0) + modifiers.statusResistance;
    stats.statusDurationReduction = Number(stats.statusDurationReduction || 0) + modifiers.statusDurationReduction;
    stats.debuffChanceBonus = Number(stats.debuffChanceBonus || 0) + modifiers.debuffChanceBonus;
    stats.debuffDurationBonus = Number(stats.debuffDurationBonus || 0) + modifiers.debuffDurationBonus;
    stats.comboAttack = Number(stats.comboAttack || 0) + modifiers.comboAttack;
    stats.comboEffectiveness = Number(stats.comboEffectiveness || 0) + modifiers.comboEffectiveness;
    stats.healthRegen = Number(stats.healthRegen || 0) + stats.health * modifiers.healthRegenPercent;
    stats.damageTypeModifiers = stats.damageTypeModifiers || {};
    for (const [type, value] of Object.entries(modifiers.damageTypeFinal || {})) {
        if (Number(value)) stats.damageTypeModifiers[type] = Number(stats.damageTypeModifiers[type] || 1) * (1 + Number(value));
    }
    if (modifiers.dominantDamageFinal) {
        const dominant = Object.entries(stats.damageTypes || {}).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0];
        if (dominant) stats.damageTypeModifiers[dominant] = Number(stats.damageTypeModifiers[dominant] || 1) * (1 + modifiers.dominantDamageFinal);
    }
    for (const [type, value] of Object.entries(modifiers.resistances || {})) {
        stats.defenseTypes[type] = Number(stats.defenseTypes[type] || 0) + Number(value || 0);
    }
    if (modifiers.lowestResistance) {
        const lowest = Object.keys(stats.defenseTypes || {}).sort((a, b) => Number(stats.defenseTypes[a] || 0) - Number(stats.defenseTypes[b] || 0))[0];
        if (lowest) stats.defenseTypes[lowest] = Number(stats.defenseTypes[lowest] || 0) + modifiers.lowestResistance;
    }
    return stats;
}

function applyActiveRunEnemyModifiers(stats) {
    if (currentRunMode !== 'operation' || !operationState || !stats) return stats;
    const modifiers = operationState.modifiers;
    const temporary = getActiveOperationTemporaryModifiers('enemy');
    const completed = Math.max(0, Number(operationState.encountersCompleted) || 0);
    stats.health = Math.max(1, Number(stats.health || 1) * (1 + modifiers.enemyHealthMultiplier + Number(temporary.healthPercent || 0)));
    const multiplier = Math.max(0.1, 1 + modifiers.enemyDamageMultiplier + Number(temporary.damageMultiplier || 0) + modifiers.enemyDamagePerEncounter * completed);
    for (const type of Object.keys(stats.damageTypes || {})) stats.damageTypes[type] *= multiplier;
    stats.attackSpeed = Math.max(0.1, Number(stats.attackSpeed || 1) * (1 + Number(temporary.attackSpeedPercent || 0)));
    return stats;
}

function healOperationPlayer(fraction) {
    const maximum = Math.max(1, Number(player?.totalStats?.health) || 1);
    const amount = Math.max(0, Math.round(maximum * Number(fraction || 0)));
    player.currentHealth = Math.min(maximum, Math.max(0, Number(player.currentHealth) || 0) + amount);
    updatePlayerStatsDisplay();
    return amount;
}

function resolveOperationEncounterReward(reward, random = Math.random) {
    if (!reward) return null;
    if (reward.kind === 'core') return grantOperationCore(random);
    if (reward.kind === 'cache') return grantOperationCache(random);
    if (reward.kind === 'flux') return grantOperationFlux(1, random);
    if (reward.kind === 'damageMaterial') {
        const type = OPERATION_DAMAGE_TYPES[Math.floor(random() * OPERATION_DAMAGE_TYPES.length)];
        return grantOperationMaterial(pickOperationMaterial(type, random), 1);
    }
    return null;
}

function tryConsumeOperationSurvivalProtocol(target) {
    if (currentRunMode !== 'operation' || !operationState?.survivalProtocol || target !== player || target.currentHealth > 0) return false;
    const protocol = operationState.survivalProtocol;
    operationState.survivalProtocol = null;
    target.currentHealth = protocol === 'health'
        ? Math.max(1, Math.round(Number(target.totalStats?.health || 1) * 0.3))
        : 1;
    if (protocol === 'shield') target.currentShield = Math.max(0, Math.round(Number(target.totalStats?.energyShield || 0) * 0.5));
    logMessage('Emergency Survival Protocol activated.');
    updatePlayerStatsDisplay();
    return true;
}

function processOperationLootDrop(kind, item) {
    if (currentRunMode !== 'operation' || !operationState || !item) return item;
    const duplicationKind = kind === 'core' ? 'core' : kind === 'feed' ? 'feed' : kind === 'material' ? 'material' : null;
    if (duplicationKind && operationState.dropDuplication[duplicationKind] > 0) {
        operationState.dropDuplication[duplicationKind]--;
        item.quantity = Math.max(1, Number(item.quantity) || 1) * 2;
        logMessage(`Temporal echo duplicated ${item.name || 'the drop'}.`);
    }
    return item;
}

function getOperationMaterialDropMultiplier(monster, item) {
    if (currentRunMode !== 'operation' || !operationState || !item) return 1;
    const type = typeof getEnemyTheme === 'function' ? getEnemyTheme(monster) : null;
    return 1 + Math.max(0, Number(operationState.modifiers.materialFindByType?.[type]) || 0);
}

function completeOperationEncounter() {
    if (currentRunMode !== 'operation' || !operationState) return;
    const encounterMeta = operationState.activeEncounterMeta;
    if (encounterMeta?.reward) resolveOperationEncounterReward(encounterMeta.reward);
    if (encounterMeta?.bountyId && operationState.pendingBounties[encounterMeta.bountyId]) {
        const bounty = operationState.pendingBounties[encounterMeta.bountyId];
        bounty.remaining = Math.max(0, Number(bounty.remaining || 0) - 1);
        if (bounty.remaining <= 0) {
            queueOperationCompletionReward(operationState, bounty.reward);
            delete operationState.pendingBounties[encounterMeta.bountyId];
        }
    }
    operationState.activeEncounterMeta = null;
    operationState.encountersCompleted = currentMonsterIndex;
    operationState.temporaryEffects = operationState.temporaryEffects
        .map(effect => ({ ...effect, remainingEncounters: Math.max(0, Number(effect.remainingEncounters || 0) - 1) }))
        .filter(effect => effect.remainingEncounters > 0);
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
        && (currentMonsterIndex >= operationState.nextEventAt
            || operationState.bonusEventsAt.some(index => index <= currentMonsterIndex));
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
    // Combat is already stopped between encounters. Pause the independent
    // regeneration clock as well so waiting on this choice has no benefit.
    stopHealthRegen();
    const bonusIndex = operationState.bonusEventsAt.findIndex(index => index <= currentMonsterIndex);
    const isBonusEvent = bonusIndex >= 0;
    const unused = OPERATION_EVENT_DEFINITIONS.filter(event => !operationState.usedEventIds.includes(event.id));
    const eventPool = unused.length > 0 ? unused : OPERATION_EVENT_DEFINITIONS;
    const definition = eventPool[Math.floor(random() * eventPool.length)] || eventPool[0];
    const overlay = document.createElement('div');
    overlay.id = 'operation-event-overlay';
    overlay.className = 'operation-event-overlay';
    const card = document.createElement('section');
    card.className = 'operation-event-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.innerHTML = `<header><span>${isBonusEvent ? 'BONUS EVENT — DEEP SECTOR CLAIM BEACON' : 'OPERATION EVENT'}</span><h2>${definition.title}</h2></header><p>${definition.description}</p><div class="operation-event-options"></div>`;
    const options = card.querySelector('.operation-event-options');
    definition.choices.forEach(choice => {
        const button = document.createElement('button');
        button.type = 'button';
        button.innerHTML = `<strong>${choice.label}</strong><span>${choice.detail}</span>`;
        button.addEventListener('click', () => {
            const previousMaximumShield = Math.max(0, Number(player.totalStats?.energyShield) || 0);
            const previousCurrentShield = Math.max(0, Number(player.currentShield) || 0);
            const previousMaximumHealth = Math.max(1, Number(player.totalStats?.health) || 1);
            let resolved = false;
            const finishChoice = () => {
                if (resolved) return;
                resolved = true;
                operationState.eventCount++;
                operationState.usedEventIds.push(definition.id);
                if (isBonusEvent) operationState.bonusEventsAt.splice(bonusIndex, 1);
                else scheduleNextOperationEvent(random);
                closeOperationEvent();
                player.calculateStats();
                const nextMaximumHealth = Math.max(1, Number(player.totalStats?.health) || previousMaximumHealth);
                if (operationState.pendingHealthGainPercent > 0) {
                    player.currentHealth = Math.min(nextMaximumHealth, Number(player.currentHealth || 0) + Math.max(0, nextMaximumHealth - previousMaximumHealth));
                    operationState.pendingHealthGainPercent = 0;
                }
                const nextMaximumShield = Math.max(0, Number(player.totalStats?.energyShield) || 0);
                player.currentShield = Math.min(
                    nextMaximumShield,
                    previousCurrentShield + Math.max(0, nextMaximumShield - previousMaximumShield)
                );
                updatePlayerStatsDisplay();
                logMessage(`${definition.title}: ${choice.label}.`);
                if (player.currentHealth <= 0) {
                    stopCombat('playerDefeated');
                    return;
                }
                beginNextMonsterInSequence();
            };
            const outcome = choice.apply(operationState, random);
            if (outcome?.deferred && typeof outcome.mount === 'function') outcome.mount(options, finishChoice);
            else finishChoice();
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
window.OPERATION_BOARD_VERSION = OPERATION_BOARD_VERSION;
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
window.tryConsumeOperationSurvivalProtocol = tryConsumeOperationSurvivalProtocol;
window.processOperationLootDrop = processOperationLootDrop;
window.getOperationMaterialDropMultiplier = getOperationMaterialDropMultiplier;
window.resolveOperationEncounterReward = resolveOperationEncounterReward;
window.shouldTriggerOperationEvent = shouldTriggerOperationEvent;
window.showOperationEvent = showOperationEvent;
window.isOperationEventVisible = isOperationEventVisible;
window.getOperationEncounterTarget = getOperationEncounterTarget;
window.clearActiveRunState = clearActiveRunState;
