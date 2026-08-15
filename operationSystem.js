// Operation-only Core effects, randomized between-encounter events, and run modifiers.

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
    const state = normalizeOperationState({ encounterTarget: location?.numFights || 1, nextEventAt: 1 });
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
