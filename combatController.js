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

function getPrimaryEnemyAbility(combatant) {
    return typeof getEnemyAbilityDefinitions === 'function'
        ? getEnemyAbilityDefinitions(combatant)[0] || null
        : null;
}

function initializeEnemyAbilityState(combatant) {
    if (!combatant) return null;
    const existing = combatant._enemyAbilityState && typeof combatant._enemyAbilityState === 'object'
        ? combatant._enemyAbilityState
        : {};
    combatant._enemyAbilityState = {
        berserkerElapsed: Math.max(0, Number(existing.berserkerElapsed) || 0),
        berserkerStacks: Math.max(0, Math.floor(Number(existing.berserkerStacks) || 0)),
        shieldTargetId: typeof existing.shieldTargetId === 'string' ? existing.shieldTargetId : null,
        shieldTextElapsed: Math.max(0, Number(existing.shieldTextElapsed) || 0),
        shieldTextAmount: Math.max(0, Number(existing.shieldTextAmount) || 0)
    };
    return combatant._enemyAbilityState;
}

function getEnemyActionInterval(combatant) {
    const ability = getPrimaryEnemyAbility(combatant);
    if (ability?.replacesAttack && Number(ability.actionInterval) > 0) {
        return Math.max(0.25, Number(ability.actionInterval));
    }
    return Math.max(0.1, 1 / Math.max(0.1, Number(combatant?.totalStats?.attackSpeed) || 1));
}

function getEnemyActionLabel(combatant) {
    return getPrimaryEnemyAbility(combatant)?.actionLabel || 'Attack Time';
}

function findRepairTarget(source) {
    return getLivingEnemies()
        .filter(candidate => candidate !== source && candidate.currentHealth < Number(candidate.totalStats?.health || 1))
        .sort((left, right) => {
            const leftRatio = left.currentHealth / Math.max(1, Number(left.totalStats?.health) || 1);
            const rightRatio = right.currentHealth / Math.max(1, Number(right.totalStats?.health) || 1);
            return leftRatio - rightRatio;
        })[0] || null;
}

function findCleanseTarget(source) {
    return getLivingEnemies()
        .filter(candidate => candidate !== source && Array.isArray(candidate.activeDebuffs) && candidate.activeDebuffs.length > 0)
        .sort((left, right) => right.activeDebuffs.length - left.activeDebuffs.length)[0] || null;
}

function findShieldProjectionTarget(source) {
    return getLivingEnemies()
        .filter(candidate => candidate !== source && Number(candidate.totalStats?.energyShield || 0) > 0)
        .sort((left, right) => {
            const leftRatio = Number(left.currentShield || 0) / Math.max(1, Number(left.totalStats?.energyShield) || 1);
            const rightRatio = Number(right.currentShield || 0) / Math.max(1, Number(right.totalStats?.energyShield) || 1);
            return leftRatio - rightRatio;
        })[0] || null;
}

function executeRepairAbility(source, ability) {
    const target = findRepairTarget(source);
    if (!target) return false;
    const maximumHealth = Math.max(1, Number(target.totalStats?.health) || 1);
    const before = Math.max(0, Number(target.currentHealth) || 0);
    const requested = maximumHealth * Math.max(0, Number(ability.healPercent) || 0);
    if (typeof healEntity === 'function') healEntity(target, requested);
    else target.currentHealth = Math.min(maximumHealth, before + requested);
    const restored = Math.max(0, Number(target.currentHealth) - before);
    if (restored <= 0) return false;
    if (typeof playEnemySupportAbilityEffect === 'function') {
        playEnemySupportAbilityEffect(source, target, 'repair', { amount: restored });
    }
    return true;
}

function executeCleanserAbility(source) {
    const target = findCleanseTarget(source);
    if (!target) return false;
    const removed = target.activeDebuffs.length;
    clearCombatantDebuffs(target);
    if (typeof calculateEnemyStats === 'function') calculateEnemyStats(target);
    if (typeof addToCombatLog === 'function') {
        addToCombatLog(`${source.name} cleanses ${removed} debuff${removed === 1 ? '' : 's'} from ${target.name}.`, '#64dfdf');
    }
    if (typeof playEnemySupportAbilityEffect === 'function') {
        playEnemySupportAbilityEffect(source, target, 'cleanse', { label: 'CLEANSED' });
    }
    return true;
}

function executeShieldProjectorAbility(source) {
    const state = initializeEnemyAbilityState(source);
    let target = getEnemyByCombatId(state.shieldTargetId);
    if (!target || target.currentHealth <= 0 || Number(target.totalStats?.energyShield || 0) <= 0) {
        target = findShieldProjectionTarget(source);
        state.shieldTargetId = target?._combatId || null;
        if (target && typeof addToCombatLog === 'function') {
            addToCombatLog(`${source.name} channels shielding into ${target.name}.`, '#74c0fc');
        }
        if (target && typeof playEnemySupportAbilityEffect === 'function') {
            playEnemySupportAbilityEffect(source, target, 'shieldProjector', { label: 'LINKED' });
        }
    }
    return Boolean(target);
}

function executeEnemyAction(attacker) {
    const ability = getPrimaryEnemyAbility(attacker);
    let handled = false;
    if (ability?.id === 'repair') handled = executeRepairAbility(attacker, ability);
    else if (ability?.id === 'cleanser') handled = executeCleanserAbility(attacker);
    else if (ability?.id === 'shieldProjector') handled = executeShieldProjectorAbility(attacker);
    if (!handled) enemyAttack(attacker);
}

function processShieldProjectorChannels(deltaTime) {
    for (const source of getLivingEnemies()) {
        if (typeof hasEnemyAbility !== 'function' || !hasEnemyAbility(source, 'shieldProjector')) continue;
        const state = initializeEnemyAbilityState(source);
        const target = getEnemyByCombatId(state.shieldTargetId);
        if (!target || target.currentHealth <= 0 || Number(target.totalStats?.energyShield || 0) <= 0) {
            state.shieldTargetId = null;
            continue;
        }
        const ability = getEnemyAbilityDefinition('shieldProjector');
        const maximumShield = Math.max(0, Number(target.totalStats?.energyShield) || 0);
        const before = Math.max(0, Number(target.currentShield) || 0);
        target.currentShield = Math.min(maximumShield, before + maximumShield * Number(ability.shieldPerSecond || 0) * deltaTime);
        const restored = Math.max(0, target.currentShield - before);
        state.shieldTextElapsed += deltaTime;
        state.shieldTextAmount += restored;
        if (state.shieldTextElapsed >= 0.8) {
            if (state.shieldTextAmount >= 1 && typeof showEnemyAbilityFloatingText === 'function') {
                showEnemyAbilityFloatingText(target, `+${Math.round(state.shieldTextAmount)} ES`, 'shield');
            }
            state.shieldTextElapsed = 0;
            state.shieldTextAmount = 0;
        }
    }
}

function refreshEnemyAbilityDerivedStats() {
    for (const candidate of getLivingEnemies()) {
        const currentHealth = Math.max(0, Number(candidate.currentHealth) || 0);
        const currentShield = Math.max(0, Number(candidate.currentShield) || 0);
        if (typeof calculateEnemyStats === 'function') calculateEnemyStats(candidate);
        candidate.currentHealth = Math.min(currentHealth, Math.max(1, Number(candidate.totalStats?.health) || 1));
        candidate.currentShield = Math.min(currentShield, Math.max(0, Number(candidate.totalStats?.energyShield) || 0));
        if (enemyNextAttackTimes?.[candidate._combatId] !== undefined) {
            enemyNextAttackTimes[candidate._combatId] = getEnemyActionInterval(candidate);
            if (typeof startAttackProgressBarCycle === 'function') {
                startAttackProgressBarCycle(
                    candidate,
                    enemyNextAttackTimes[candidate._combatId],
                    Math.min(
                        Number(enemyAttackTimers?.[candidate._combatId]) || 0,
                        enemyNextAttackTimes[candidate._combatId]
                    )
                );
            }
        }
    }
    if (typeof refreshPlayerAttackInterval === 'function') refreshPlayerAttackInterval();
}

function processBerserkerAbilities(deltaTime) {
    let statsChanged = false;
    for (const source of getLivingEnemies()) {
        if (typeof hasEnemyAbility !== 'function' || !hasEnemyAbility(source, 'berserker')) continue;
        const ability = getEnemyAbilityDefinition('berserker');
        const state = initializeEnemyAbilityState(source);
        if (state.berserkerStacks >= ability.maxStacks) continue;
        state.berserkerElapsed += deltaTime;
        while (state.berserkerElapsed >= ability.stackInterval && state.berserkerStacks < ability.maxStacks) {
            state.berserkerElapsed -= ability.stackInterval;
            state.berserkerStacks++;
            statsChanged = true;
            if (typeof playEnemySelfAbilityEffect === 'function') {
                playEnemySelfAbilityEffect(source, 'berserker', `RAGE ${state.berserkerStacks}/${ability.maxStacks}`);
            }
            if (typeof addToCombatLog === 'function') {
                addToCombatLog(`${source.name} gains Rage ${state.berserkerStacks}/${ability.maxStacks}.`, '#ff9f43');
            }
        }
    }
    if (statsChanged) refreshEnemyAbilityDerivedStats();
}

function removeOneEnemyDebuff(target) {
    const debuff = Array.isArray(target?.activeDebuffs) ? target.activeDebuffs[0] : null;
    if (!debuff) return false;
    const identifier = debuff.id || debuff.name;
    if (identifier && typeof removeDebuff === 'function') return removeDebuff(target, identifier);
    debuff.onRemove?.(target);
    target.activeDebuffs.shift();
    return true;
}

function restoreEmpoweredResource(target, resource, amount) {
    const maximumKey = resource === 'shield' ? 'energyShield' : 'health';
    const currentKey = resource === 'shield' ? 'currentShield' : 'currentHealth';
    const maximum = Math.max(0, Number(target?.totalStats?.[maximumKey]) || 0);
    const before = Math.max(0, Number(target?.[currentKey]) || 0);
    target[currentKey] = Math.min(maximum, before + Math.max(0, Number(amount) || 0));
    return Math.max(0, target[currentKey] - before);
}

function processEmpoweredRegeneration(deltaTime) {
    const auraSources = typeof getActiveEmpoweredAuraSources === 'function'
        ? getActiveEmpoweredAuraSources()
        : new Map();
    for (const target of getLivingEnemies()) {
        const state = typeof initializeEmpoweredModifierState === 'function'
            ? initializeEmpoweredModifierState(target)
            : null;
        if (!state) continue;
        let restored = 0;
        if (typeof hasEmpoweredModifier === 'function' && hasEmpoweredModifier(target, 'regenerating')) {
            restored += restoreEmpoweredResource(target, 'health', Number(target.totalStats?.health || 0) * 0.03 * deltaTime);
        }
        if (auraSources.has('mendingAura')) {
            restored += restoreEmpoweredResource(target, 'health', Number(target.totalStats?.health || 0) * 0.0125 * deltaTime);
        }
        if (auraSources.has('barrierAura')) {
            restoreEmpoweredResource(target, 'shield', Number(target.totalStats?.energyShield || 0) * 0.04 * deltaTime);
        }
        state.healTextElapsed += deltaTime;
        state.healTextAmount += restored;
        if (state.healTextElapsed >= 0.8) {
            if (state.healTextAmount >= 1 && typeof showEnemyAbilityFloatingText === 'function') {
                showEnemyAbilityFloatingText(target, `+${Math.round(state.healTextAmount)}`, 'heal');
            }
            state.healTextElapsed = 0;
            state.healTextAmount = 0;
        }
    }
}

function processEmpoweredEscalation(deltaTime) {
    let statsChanged = false;
    for (const source of getLivingEnemies()) {
        const state = typeof initializeEmpoweredModifierState === 'function'
            ? initializeEmpoweredModifierState(source)
            : null;
        if (!state) continue;
        if (typeof hasEmpoweredModifier === 'function' && hasEmpoweredModifier(source, 'frenzied') && state.frenziedStacks < 5) {
            state.frenziedElapsed += deltaTime;
            while (state.frenziedElapsed >= 4 && state.frenziedStacks < 5) {
                state.frenziedElapsed -= 4;
                state.frenziedStacks++;
                statsChanged = true;
                if (typeof playEnemySelfAbilityEffect === 'function') playEnemySelfAbilityEffect(source, 'frenzied', `FRENZY ${state.frenziedStacks}/5`);
            }
        }
    }
    const escalationSource = typeof getActiveEmpoweredAuraSources === 'function'
        ? getActiveEmpoweredAuraSources().get('escalationAura')
        : null;
    if (escalationSource) {
        const state = initializeEmpoweredModifierState(escalationSource);
        state.escalationElapsed += deltaTime;
        while (state.escalationElapsed >= 5 && state.escalationStacks < 5) {
            state.escalationElapsed -= 5;
            state.escalationStacks++;
            statsChanged = true;
            if (typeof playEnemySelfAbilityEffect === 'function') playEnemySelfAbilityEffect(escalationSource, 'escalation', `ESCALATION ${state.escalationStacks}/5`);
        }
    }
    if (statsChanged) refreshEnemyAbilityDerivedStats();
}

function processEmpoweredCleansing(deltaTime) {
    for (const source of getLivingEnemies()) {
        const state = typeof initializeEmpoweredModifierState === 'function'
            ? initializeEmpoweredModifierState(source)
            : null;
        if (!state) continue;
        if (typeof hasEmpoweredModifier === 'function' && hasEmpoweredModifier(source, 'nullifying')) {
            state.nullifyElapsed += deltaTime;
            if (state.nullifyElapsed >= 5) {
                state.nullifyElapsed %= 5;
                const target = getLivingEnemies()
                    .filter(candidate => Array.isArray(candidate.activeDebuffs) && candidate.activeDebuffs.length > 0)
                    .sort((left, right) => right.activeDebuffs.length - left.activeDebuffs.length)[0];
                if (target && removeOneEnemyDebuff(target) && typeof playEnemySupportAbilityEffect === 'function') {
                    playEnemySupportAbilityEffect(source, target, 'cleanse', { label: 'NULLIFIED' });
                }
            }
        }
    }
    const cleansingSource = typeof getActiveEmpoweredAuraSources === 'function'
        ? getActiveEmpoweredAuraSources().get('cleansingAura')
        : null;
    if (cleansingSource) {
        const state = initializeEmpoweredModifierState(cleansingSource);
        state.cleanseElapsed += deltaTime;
        if (state.cleanseElapsed >= 6) {
            state.cleanseElapsed %= 6;
            for (const target of getLivingEnemies()) {
                if (removeOneEnemyDebuff(target) && typeof playEnemySupportAbilityEffect === 'function') {
                    playEnemySupportAbilityEffect(cleansingSource, target, 'cleanse', { label: 'CLEANSED' });
                }
            }
        }
    }
}

function processEmpoweredAuraPresentations(deltaTime) {
    if (typeof getActiveEmpoweredAuraSources !== 'function') return;
    for (const [auraId, source] of getActiveEmpoweredAuraSources()) {
        const state = initializeEmpoweredModifierState(source);
        state.auraPulseElapsedById[auraId] = Math.max(0, Number(state.auraPulseElapsedById[auraId]) || 0) + deltaTime;
        if (state.auraPulseElapsedById[auraId] < 2) continue;
        state.auraPulseElapsedById[auraId] %= 2;
        if (typeof playEmpoweredAuraPulse === 'function') playEmpoweredAuraPulse(source, getLivingEnemies(), auraId);
    }
}

function processEmpoweredModifiers(deltaTime) {
    processEmpoweredRegeneration(deltaTime);
    processEmpoweredEscalation(deltaTime);
    processEmpoweredCleansing(deltaTime);
    processEmpoweredAuraPresentations(deltaTime);
}

function processEnemyAbilities(deltaTime) {
    processShieldProjectorChannels(deltaTime);
    processBerserkerAbilities(deltaTime);
    processEmpoweredModifiers(deltaTime);
}

function applyEnemyAbilityStatModifiers(combatant, stats) {
    if (!combatant || !stats) return stats;
    const commander = getLivingEnemies().find(candidate => (
        candidate !== combatant
        && typeof hasEnemyAbility === 'function'
        && hasEnemyAbility(candidate, 'commander')
    ));
    if (commander) {
        const ability = getEnemyAbilityDefinition('commander');
        stats.attackSpeed *= 1 + Number(ability.attackSpeedMultiplier || 0);
        stats.precision += Number(ability.precisionBonus || 0);
        for (const type of Object.keys(stats.damageTypes || {})) {
            stats.damageTypes[type] *= 1 + Number(ability.damageMultiplier || 0);
        }
    }
    if (typeof hasEnemyAbility === 'function' && hasEnemyAbility(combatant, 'berserker')) {
        const ability = getEnemyAbilityDefinition('berserker');
        const stacks = Math.max(0, Number(combatant._enemyAbilityState?.berserkerStacks) || 0);
        stats.attackSpeed *= 1 + stacks * Number(ability.attackSpeedPerStack || 0);
        for (const type of Object.keys(stats.damageTypes || {})) {
            stats.damageTypes[type] *= 1 + stacks * Number(ability.damagePerStack || 0);
        }
    }
    if (typeof applyEmpoweredModifierStatModifiers === 'function') {
        applyEmpoweredModifierStatModifiers(combatant, stats);
    }
    return stats;
}

function isEnemyAffectedByCommander(combatant) {
    return getLivingEnemies().some(candidate => (
        candidate !== combatant
        && typeof hasEnemyAbility === 'function'
        && hasEnemyAbility(candidate, 'commander')
    ));
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

function createEnemyInstance(monsterName, isEmpowered, slotIndex, rewardScale, options = {}) {
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
    initializeEnemyAbilityState(instance);
    instance._defeatHandled = false;
    instance._operationLootChanceMultiplier = Math.max(0, Number(options.lootChanceMultiplier) || 1);

    const levelOverride = options.levelOverride
        ? Math.max(1, Math.min(100, Math.floor(Number(options.levelOverride) || 1)))
        : null;

    if (template.dynamicOperationSecurity && levelOverride) {
        const targetLevel = levelOverride;
        const registry = (Array.isArray(window.enemies) ? window.enemies : [])
            .filter(candidate => !candidate.dynamicOperationSecurity && !candidate.developerOnly && !candidate.isTrainingDummy);
        const source = registry.slice().sort((left, right) => (
            Math.abs(Number(left.level || 1) - targetLevel) - Math.abs(Number(right.level || 1) - targetLevel)
        ))[0];
        if (source) {
            instance.level = targetLevel;
            instance.zone = Math.max(1, Math.min(20, Math.ceil(targetLevel / 5)));
            for (const key of ['health', 'energyShield', 'attackSpeed', 'criticalChance', 'criticalMultiplier', 'precision', 'deflection', 'experienceValue']) {
                if (source[key] !== undefined) instance[key] = JSON.parse(JSON.stringify(source[key]));
            }
            for (const key of ['damageTypes', 'defenseTypes', 'lootConfig', 'currencyDrop']) {
                if (source[key] !== undefined) instance[key] = JSON.parse(JSON.stringify(source[key]));
            }
            const roleTuning = {
                command: { health: 1.35, shield: 1.2, damage: 1.2, speed: 0.82 },
                interceptor: { health: 0.72, shield: 0.75, damage: 0.72, speed: 1.25 },
                suppression: { health: 0.78, shield: 0.9, damage: 1.35, speed: 0.78 }
            }[template.operationSecurityRole] || { health: 1, shield: 1, damage: 1, speed: 1 };
            instance.health = Math.max(1, Math.round(Number(instance.health || 1) * roleTuning.health));
            instance.energyShield = Math.max(0, Math.round(Number(instance.energyShield || 0) * roleTuning.shield));
            instance.attackSpeed = Math.max(0.1, Number(instance.attackSpeed || 1) * roleTuning.speed);
            for (const type of Object.keys(instance.damageTypes || {})) {
                instance.damageTypes[type] = Math.max(1, Math.round(Number(instance.damageTypes[type] || 1) * roleTuning.damage));
            }
        }
    }

    // Deep Sector scaling modifies the base enemy before empowerment. Keeping
    // this here makes authored archetypes retain their identity while every
    // level above 50 consistently adds durability, damage, and accuracy.
    if (levelOverride) {
        instance.level = levelOverride;
        instance.zone = Math.max(1, Math.min(20, Math.ceil(levelOverride / 5)));
        const excessLevels = Math.max(0, levelOverride - 50);
        if (excessLevels > 0) {
            const durabilityMultiplier = 1 + excessLevels * 0.07;
            const damageMultiplier = 1 + excessLevels * 0.04;
            instance.health = Math.max(1, Math.round(Number(instance.health || 1) * durabilityMultiplier));
            instance.energyShield = Math.max(0, Math.round(Number(instance.energyShield || 0) * durabilityMultiplier));
            for (const type of Object.keys(instance.damageTypes || {})) {
                instance.damageTypes[type] = Math.max(1, Math.round(Number(instance.damageTypes[type] || 1) * damageMultiplier));
            }
            instance.precision = Number(instance.precision || 0) + excessLevels * 2;
            instance.deflection = Number(instance.deflection || 0) + excessLevels * 2;
            if (instance.currencyDrop) {
                const feedMultiplier = 1 + excessLevels * 0.03;
                instance.currencyDrop.min = Math.max(1, Math.round(Number(instance.currencyDrop.min || 1) * feedMultiplier));
                instance.currencyDrop.max = Math.max(instance.currencyDrop.min, Math.round(Number(instance.currencyDrop.max || instance.currencyDrop.min) * feedMultiplier));
            }
        }
    }

    if (isEmpowered && typeof applyEmpoweredBaseModifiers === 'function') {
        instance.isEmpowered = true;
        applyEmpoweredBaseModifiers(instance, {
            modifierIds: options.empoweredModifierIds,
            random: options.random,
            deepSector: Boolean(options.deepSector || levelOverride > 50 || currentDelveLocation?.deepSector)
        });
        instance.name = `Empowered ${instance.name}`;
    }

    instance.currentHealth = instance.health;
    instance.currentShield = instance.energyShield || 0;
    if (typeof calculateEnemyStats === 'function') calculateEnemyStats(instance);
    instance.currentHealth = Math.max(1, Number(instance.totalStats?.health) || instance.health || 1);
    instance.currentShield = Math.max(0, Number(instance.totalStats?.energyShield) || 0);
    ensureEntityInitialization(instance, false);
    return instance;
}

function assignEncounterExperienceRewards(group) {
    const allocations = group.map(candidate => {
        const empoweredMultiplier = typeof getEmpoweredRewardProfile === 'function'
            ? getEmpoweredRewardProfile(candidate, { playerLevel: player?.level }).experienceMultiplier
            : (candidate.isEmpowered ? 1.4 : 1);
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
    const runRewardScale = currentRunMode === 'operation' ? 1.15 : currentRunMode === 'patrol' ? 0.75 : 1;
    const rewardScale = runRewardScale / entries.length;
    encounterEnemies = entries.map((entry, slotIndex) => createEnemyInstance(
        entry.name,
        Boolean(entry.isEmpowered),
        slotIndex,
        rewardScale,
        entry
    ));
    refreshEnemyAbilityDerivedStats();
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
    if (typeof cancelCombatVfx === 'function') cancelCombatVfx();
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
        enemyNextAttackTimes[candidate._combatId] = getEnemyActionInterval(candidate);
    }
    startHealthRegen();
    lastCombatLoopTime = Date.now();
    combatInterval = setInterval(combatLoop, 100);
    setFleeControlState({ visible: true });
    if (typeof setDelveCombatUIActive === 'function') setDelveCombatUIActive(true);
    updatePlayerStatsDisplay();
    updateEnemyStatsDisplay();
    if (typeof startAttackProgressBarCycle === 'function') {
        startAttackProgressBarCycle('player', playerNextAttackTime);
        for (const candidate of getLivingEnemies()) {
            startAttackProgressBarCycle(candidate, enemyNextAttackTimes[candidate._combatId]);
        }
    }
    displayAdventureLocations();
}

function combatLoop() {
    if (!isCombatActive) return;
    const now = Date.now();
    const deltaTime = Math.max(0, (now - lastCombatLoopTime) / 1000);
    lastCombatLoopTime = now;
    processEnemyTaunts(deltaTime);
    processEnemyAbilities(deltaTime);

    if (player) {
        if (playerNextAttackTime <= 0) refreshPlayerAttackInterval();
        playerAttackTimer += deltaTime;
        if (playerAttackTimer >= playerNextAttackTime) {
            playerAttackTimer = 0;
            refreshPlayerAttackInterval();
            if (getEffectivePlayerTarget()) playerAttack();
            if (typeof startAttackProgressBarCycle === 'function') {
                startAttackProgressBarCycle('player', playerNextAttackTime);
            }
        }
    }

    for (const attacker of getLivingEnemies()) {
        const id = attacker._combatId;
        let nextAttack = Number(enemyNextAttackTimes[id]) || getEnemyActionInterval(attacker);
        let timer = Number(enemyAttackTimers[id]) || 0;
        timer += deltaTime;
        if (timer >= nextAttack) {
            timer = 0;
            nextAttack = getEnemyActionInterval(attacker);
            executeEnemyAction(attacker);
            if (!isCombatActive || player.currentHealth <= 0) return;
            if (typeof startAttackProgressBarCycle === 'function') {
                startAttackProgressBarCycle(attacker, nextAttack);
            }
        }
        enemyAttackTimers[id] = timer;
        enemyNextAttackTimes[id] = nextAttack;
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
    if (typeof clearEnemySupportEffects === 'function') clearEnemySupportEffects();
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
    const finishedRunMode = currentRunMode;
    const finishedRunLocation = currentDelveLocation;
    let shouldRestartPatrol = false;
    if (reason === 'playerDefeated' && finishedRunMode === 'patrol' && finishedRunLocation) {
        try {
            shouldRestartPatrol = localStorage.getItem('autoPatrolRedeploy') === 'true';
        } catch (error) { /* local storage is optional */ }
    }
    if (typeof cancelPropagationPresentations === 'function') cancelPropagationPresentations();
    if (typeof cancelCombatVfx === 'function') cancelCombatVfx();
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
            clearActiveRunState();
            stopHealthRegen();
            startHealthRegen();
        } else if (reason === 'enemyDefeated') {
            currentMonsterIndex++;
            clearBuffs(player);
            if (currentRunMode === 'operation') completeOperationEncounter();
            const hasAnotherEncounter = currentRunMode === 'patrol'
                || (currentDelveLocation && currentMonsterIndex < getOperationEncounterTarget());
            if (hasAnotherEncounter) {
                refreshEnergyShieldBetweenDelveEncounters();
            }
            resetEncounterState();
            updateEnemyStatsDisplay();
            if (shouldTriggerOperationEvent()) {
                showOperationEvent();
                return;
            }
            interFightPauseTimer = setTimeout(beginNextMonsterInSequence, 3000);
            return;
        }
    }

    if (reason === 'delveCompleted') {
        isDelveInProgress = false;
        currentDelveLocation = null;
        currentMonsterIndex = 0;
        clearActiveRunState();
        stopHealthRegen();
        startHealthRegen();
    }

    resetEncounterState();
    updateEnemyStatsDisplay();
    initializeEnemyStatsDisplay();
    if (typeof setDelveCombatUIActive === 'function') setDelveCombatUIActive(false);
    displayAdventureLocations();
    if (shouldRestartPatrol) {
        logMessage(`Patrol redeploying in ${finishedRunLocation.name} after defeat.`);
        setTimeout(() => startPatrol(finishedRunLocation), 500);
    }
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
