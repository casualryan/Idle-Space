// Combat Style selection, mastery choices, and live attack-pattern resolution.

function getCombatStyles() {
    return window.combatStyles || window.combatSkills || [];
}

function getDefaultCombatStyleId() {
    return window.DEFAULT_COMBAT_STYLE_ID || 'balancedStyle';
}

function getCombatStyleVersion() {
    return Math.max(1, Math.floor(Number(window.COMBAT_STYLE_VERSION) || 1));
}

function getStyleTierThresholds() {
    return window.STYLE_TIER_THRESHOLDS || [11, 26, 41];
}

function getSkillDefinition(styleId) {
    const styles = getCombatStyles();
    return styles.find(style => style.id === styleId)
        || styles.find(style => style.id === getDefaultCombatStyleId())
        || styles[0]
        || null;
}

function getCombatStyleDefinition(styleId) {
    return getSkillDefinition(styleId);
}

function getEquippedSkillId(playerObject) {
    if (!playerObject) return getDefaultCombatStyleId();
    const styles = getCombatStyles();
    return styles.some(style => style.id === playerObject.equippedSkillId)
        ? playerObject.equippedSkillId
        : getDefaultCombatStyleId();
}

function getStylePointsForLevel(level) {
    return getStyleTierThresholds().reduce((count, threshold) => count + (Number(level) >= threshold ? 1 : 0), 0);
}

function getStyleNextPointLevel(level) {
    return getStyleTierThresholds().find(threshold => Number(level) < threshold) || null;
}

function getUnlockedCombatStyleIds() {
    return getCombatStyles().map(style => style.id);
}

function getStyleNode(styleId, nodeId) {
    const style = getSkillDefinition(styleId);
    return style?.tree?.nodes?.find(node => node.id === nodeId) || null;
}

function getStyleTier(style, tierNumber) {
    return style?.masteries?.find(mastery => mastery.tier === Number(tierNumber)) || null;
}

function ensureCombatStyleAllocations(playerObject) {
    if (!playerObject.combatStyleAllocations || typeof playerObject.combatStyleAllocations !== 'object') {
        playerObject.combatStyleAllocations = {};
    }
    for (const style of getCombatStyles()) {
        const allocation = playerObject.combatStyleAllocations[style.id];
        if (!allocation || typeof allocation !== 'object') {
            playerObject.combatStyleAllocations[style.id] = { nodes: {} };
        } else if (!allocation.nodes || typeof allocation.nodes !== 'object' || Array.isArray(allocation.nodes)) {
            allocation.nodes = {};
        }
    }
}

function normalizeCombatStylesState(playerObject) {
    if (!playerObject) return;
    const styles = getCombatStyles();
    const styleIds = styles.map(style => style.id);
    const version = getCombatStyleVersion();

    if (Number(playerObject.combatStyleVersion) !== version) {
        playerObject.combatStyleAllocations = {};
        playerObject.combatStyleVersion = version;
    }

    playerObject.unlockedSkillIds = Array.isArray(playerObject.unlockedSkillIds)
        ? playerObject.unlockedSkillIds.filter(id => styleIds.includes(id))
        : [];
    if (playerObject.unlockedSkillIds.length === 0) playerObject.unlockedSkillIds = [...styleIds];
    if (!styleIds.includes(playerObject.equippedSkillId)) playerObject.equippedSkillId = getDefaultCombatStyleId();

    ensureCombatStyleAllocations(playerObject);
    for (const style of styles) {
        const source = playerObject.combatStyleAllocations[style.id].nodes;
        const normalized = {};
        for (const mastery of style.masteries || []) {
            const selected = mastery.choices.find(choice => Number(source[choice.id]) > 0);
            if (selected) normalized[selected.id] = 1;
        }
        playerObject.combatStyleAllocations[style.id].nodes = normalized;
    }

    // Retired skill/mod fields remain inert until the last old save has migrated.
    playerObject.skillPoints = 0;
    playerObject.skillModAllocations = {};
}

function getStyleNodePoints(playerObject, styleId, nodeId) {
    ensureCombatStyleAllocations(playerObject);
    return Number(playerObject.combatStyleAllocations[styleId]?.nodes?.[nodeId] || 0);
}

function isStyleNodePurchased(playerObject, styleId, nodeId) {
    return getStyleNodePoints(playerObject, styleId, nodeId) > 0;
}

function getSelectedStyleChoice(playerObject, styleId, tierNumber) {
    const style = getSkillDefinition(styleId);
    const tier = getStyleTier(style, tierNumber);
    if (!tier) return null;
    return tier.choices.find(choice => isStyleNodePurchased(playerObject, style.id, choice.id)) || null;
}

function getSelectedStyleChoices(playerObject, styleId) {
    const style = getSkillDefinition(styleId);
    if (!style) return [];
    return (style.masteries || [])
        .map(mastery => getSelectedStyleChoice(playerObject, style.id, mastery.tier))
        .filter(Boolean);
}

function getStyleSpentPoints(playerObject, styleId) {
    return getSelectedStyleChoices(playerObject, styleId).length;
}

function getStylePointSummary(playerObject, styleId) {
    const earned = getStylePointsForLevel(playerObject?.level || 1);
    const configured = getStyleSpentPoints(playerObject, styleId);
    return {
        earned,
        spent: configured,
        configured,
        available: Math.max(0, earned - configured),
        max: getStyleTierThresholds().length,
        nextPointLevel: getStyleNextPointLevel(playerObject?.level || 1)
    };
}

function canAllocateStyleNode(playerObject, styleId, nodeId) {
    if (!playerObject) return { ok: false, reason: 'No player.' };
    if (!canChangeSkills()) return { ok: false, reason: 'Cannot modify combat styles during combat or a delve.' };
    normalizeCombatStylesState(playerObject);
    const style = getCombatStyles().find(candidate => candidate.id === styleId);
    const node = style ? getStyleNode(style.id, nodeId) : null;
    if (!style || !node) return { ok: false, reason: 'Unknown combat style choice.' };
    if (Number(playerObject.level || 1) < Number(node.unlockLevel || 1)) {
        return { ok: false, reason: `Mastery tier unlocks at level ${node.unlockLevel}.` };
    }
    if (isStyleNodePurchased(playerObject, style.id, node.id)) {
        return { ok: false, reason: 'Choice is already selected.' };
    }
    return { ok: true };
}

function allocateStyleNode(playerObject, styleId, nodeId) {
    const check = canAllocateStyleNode(playerObject, styleId, nodeId);
    if (!check.ok) return check;
    const style = getCombatStyles().find(candidate => candidate.id === styleId);
    const node = getStyleNode(style.id, nodeId);
    const mastery = getStyleTier(style, node.tier);
    const nodes = playerObject.combatStyleAllocations[style.id].nodes;
    const replaced = mastery.choices.find(choice => Number(nodes[choice.id]) > 0) || null;
    for (const choice of mastery.choices) delete nodes[choice.id];
    nodes[node.id] = 1;
    return { ok: true, replaced: replaced?.id || null };
}

function canRefundStyleNode(playerObject, styleId, nodeId) {
    if (!playerObject) return { ok: false, reason: 'No player.' };
    if (!canChangeSkills()) return { ok: false, reason: 'Cannot modify combat styles during combat or a delve.' };
    normalizeCombatStylesState(playerObject);
    if (!getStyleNode(styleId, nodeId)) return { ok: false, reason: 'Unknown combat style choice.' };
    if (!isStyleNodePurchased(playerObject, styleId, nodeId)) return { ok: false, reason: 'Choice is not selected.' };
    return { ok: true };
}

function refundStyleNode(playerObject, styleId, nodeId) {
    const check = canRefundStyleNode(playerObject, styleId, nodeId);
    if (!check.ok) return check;
    delete playerObject.combatStyleAllocations[styleId].nodes[nodeId];
    return { ok: true };
}

function refundAllStyleNodes(playerObject, styleId) {
    if (!playerObject) return { ok: false, reason: 'No player.' };
    if (!canChangeSkills()) return { ok: false, reason: 'Cannot modify combat styles during combat or a delve.' };
    normalizeCombatStylesState(playerObject);
    if (!playerObject.combatStyleAllocations[styleId]) return { ok: false, reason: 'Unknown combat style.' };
    playerObject.combatStyleAllocations[styleId].nodes = {};
    return { ok: true };
}

function getStyleNodeStatus(playerObject, styleId, nodeId) {
    const node = getStyleNode(styleId, nodeId);
    if (!node) return { status: 'locked', reason: 'Unknown choice.' };
    if (isStyleNodePurchased(playerObject, styleId, nodeId)) return { status: 'selected', reason: 'Selected' };
    if (Number(playerObject?.level || 1) < Number(node.unlockLevel || 1)) {
        return { status: 'locked', reason: `Unlocks at level ${node.unlockLevel}` };
    }
    return { status: 'available', reason: 'Select this choice' };
}

function cloneProfileValue(value) {
    return Array.isArray(value) ? [...value] : value;
}

function applyStyleChoiceModifiers(profile, modifiers = {}) {
    for (const [key, value] of Object.entries(modifiers.add || {})) {
        profile[key] = Number(profile[key] || 0) + Number(value || 0);
    }
    for (const [key, value] of Object.entries(modifiers.multiply || {})) {
        profile[key] = Number(profile[key] || 0) * Number(value || 1);
    }
    for (const [key, value] of Object.entries(modifiers.set || {})) profile[key] = cloneProfileValue(value);
}

function resolveSkillProfile(playerObject) {
    normalizeCombatStylesState(playerObject);
    const styleId = getEquippedSkillId(playerObject);
    const style = getSkillDefinition(styleId);
    const base = style ? style.base : (window.DEFAULT_COMBAT_STYLE_PROFILE || window.DEFAULT_SKILL_PROFILE || {});
    const profile = {
        ...base,
        hitDamageMultipliers: cloneProfileValue(base.hitDamageMultipliers),
        mechanics: [...(base.mechanics || [])],
        skillId: styleId,
        displayName: style?.name || 'Balanced Style'
    };

    for (const choice of getSelectedStyleChoices(playerObject, styleId)) {
        applyStyleChoiceModifiers(profile, choice.modifiers);
        profile.mechanics.push(...(choice.mechanics || []));
    }

    const passiveStyleEffects = playerObject?.passiveBonuses?.combatStyleBonuses?.[styleId];
    if (passiveStyleEffects) {
        profile.attackTimeMultiplier *= Math.max(0.1, 1 + Number(passiveStyleEffects.attackTimeModifier || 0));
    }

    if (profile.mechanics.includes('aftershock')) {
        profile.hitCount = 2;
        profile.hitDamageMultipliers = [profile.damageMultiplier, profile.damageMultiplier * 0.25];
        profile.procOnHit = 'firstHitOnly';
        profile.procOnCritical = 'firstHitOnly';
    }

    profile.attackTimeMultiplier = Math.max(0.1, Number(profile.attackTimeMultiplier) || 1);
    profile.damageMultiplier = Math.max(0, Number(profile.damageMultiplier) || 0);
    profile.hitCount = Math.max(1, Math.floor(Number(profile.hitCount) || 1));
    profile.procCoefficient = Math.max(0, Number(profile.procCoefficient) || 0);
    profile.critChanceMultiplier = Math.max(0, Number(profile.critChanceMultiplier) || 0);
    return profile;
}

function getCombatStyleState(combatant) {
    if (!combatant) return null;
    const styleId = getEquippedSkillId(combatant);
    if (!combatant._combatStyleState || combatant._combatStyleState.styleId !== styleId) {
        combatant._combatStyleState = {
            styleId,
            attackCount: 0,
            incomingCount: 0,
            consecutiveAttacks: 0,
            lastTarget: null,
            gatheringForceStacks: 0,
            adaptiveCritReady: false,
            nextAttackHaste: 0,
            counterReady: false,
            counterStacks: 0,
            perfectCounter: false,
            counterFollowup: false,
            twinMirrorReady: false
        };
    }
    return combatant._combatStyleState;
}

function resetCombatStyleState(combatant) {
    if (combatant) delete combatant._combatStyleState;
    return getCombatStyleState(combatant);
}

function styleHasMechanic(profile, mechanic) {
    return Array.isArray(profile?.mechanics) && profile.mechanics.includes(mechanic);
}

function prepareCombatStyleAttack(attacker, defender) {
    const profile = resolveSkillProfile(attacker);
    const state = getCombatStyleState(attacker);
    profile.attackNumber = state.attackCount + 1;
    profile._hitCriticalCount = 0;

    if (styleHasMechanic(profile, 'perfectThird') && profile.attackNumber % 3 === 0) {
        profile.forceMaxDamageRoll = true;
        profile.critChanceBonus += 0.1;
    }
    if (styleHasMechanic(profile, 'alternatingPurpose')) {
        if (profile.attackNumber % 2 === 1) profile.damageMultiplier *= 1.18;
        else profile.debuffApplyBonus += 0.15;
    }
    if (styleHasMechanic(profile, 'adaptiveCrit') && state.adaptiveCritReady) profile.critChanceBonus += 0.12;
    if (styleHasMechanic(profile, 'gatheringForce')) profile.critChanceBonus += state.gatheringForceStacks * 0.05;
    if (styleHasMechanic(profile, 'executionStroke')) {
        const maximum = Math.max(1, Number(defender?.totalStats?.health || defender?.health || 1));
        if (Number(defender?.currentHealth || 0) / maximum < 0.3) profile.damageMultiplier *= 1.4;
    }

    if (profile.skillId === 'counterStyle' && (state.counterReady || state.counterFollowup)) {
        profile.isCounterAttack = true;
        profile.isCounterFollowup = state.counterFollowup;
        profile.displayName = state.counterFollowup ? 'Vengeful Follow-Up' : 'Counterattack';
        profile.damageMultiplier = state.counterFollowup ? 1.25 : 1.65 * (1 + state.counterStacks * 0.2);
        profile.damageRollFloorBonus += 0.1;
        if (state.perfectCounter) profile.forceMaxDamageRoll = true;
        if (styleHasMechanic(profile, 'counterCrit')) profile.critChanceBonus += 0.18;
        if (styleHasMechanic(profile, 'counterDebuff')) profile.debuffApplyBonus += 0.15;
    }

    if (styleHasMechanic(profile, 'mirrorFinish') && state.twinMirrorReady) {
        profile.forceCritHitIndex = Math.min(1, profile.hitCount - 1);
        state.twinMirrorReady = false;
    }
    return profile;
}

function buildHitContext(profile, hitIndex) {
    const multipliers = Array.isArray(profile.hitDamageMultipliers) ? profile.hitDamageMultipliers : null;
    const context = {
        hitIndex,
        damageMultiplier: multipliers?.[hitIndex] ?? profile.damageMultiplier,
        critChanceMultiplier: profile.critChanceMultiplier,
        critChanceBonus: profile.critChanceBonus,
        criticalDamageBonus: profile.criticalDamageBonus,
        damageRollFloorBonus: profile.damageRollFloorBonus,
        forceMaxDamageRoll: Boolean(profile.forceMaxDamageRoll),
        forceCrit: profile.forceCritHitIndex === hitIndex,
        skipCrit: false,
        debuffApplyBonus: profile.debuffApplyBonus,
        procCoefficient: profile.procCoefficient
    };
    if (styleHasMechanic(profile, 'openingFeint')) {
        if (hitIndex === 0) context.skipCrit = true;
        if (hitIndex === 1) context.critChanceBonus += 0.25;
    }
    if (styleHasMechanic(profile, 'secondHitFloor') && hitIndex === 1) context.damageRollFloorBonus += 0.12;
    if (styleHasMechanic(profile, 'convergingBlows') && hitIndex === 1) {
        if (profile._hitCriticalCount > 0) context.damageMultiplier *= 1.35;
        else context.critChanceBonus += 0.2;
    }
    return context;
}

function recordCombatStyleHit(profile, damageResult) {
    if (damageResult?.isCritical) profile._hitCriticalCount = Number(profile._hitCriticalCount || 0) + 1;
}

function restoreStyleShield(combatant, fraction) {
    const maximum = Math.max(0, Number(combatant?.totalStats?.energyShield || 0));
    if (!combatant || maximum <= 0 || fraction <= 0) return 0;
    const before = Math.max(0, Number(combatant.currentShield || 0));
    combatant.currentShield = Math.min(maximum, before + Math.max(1, Math.round(maximum * fraction)));
    return combatant.currentShield - before;
}

function finishCombatStyleAttack(attacker, defender, profile) {
    const state = getCombatStyleState(attacker);
    state.attackCount++;
    if (state.lastTarget === defender) state.consecutiveAttacks++;
    else {
        state.lastTarget = defender;
        state.consecutiveAttacks = 1;
    }

    const critical = Number(profile._hitCriticalCount || 0) > 0;
    if (styleHasMechanic(profile, 'adaptiveCrit')) state.adaptiveCritReady = !critical;
    if (styleHasMechanic(profile, 'gatheringForce')) {
        state.gatheringForceStacks = critical ? 0 : Math.min(4, state.gatheringForceStacks + 1);
    }
    if ((styleHasMechanic(profile, 'critHaste20') || styleHasMechanic(profile, 'critHaste25')) && critical) {
        state.nextAttackHaste = styleHasMechanic(profile, 'critHaste25') ? 0.25 : 0.2;
    } else if (state.nextAttackHaste > 0) {
        state.nextAttackHaste = 0;
    }
    if (styleHasMechanic(profile, 'alternatingShield') && state.attackCount % 2 === 0) restoreStyleShield(attacker, 0.03);
    if (styleHasMechanic(profile, 'mirrorFinish')) state.twinMirrorReady = Number(profile._hitCriticalCount || 0) === 1;

    if (profile.isCounterAttack) {
        if (styleHasMechanic(profile, 'shieldReprisal')) restoreStyleShield(attacker, 0.06);
        const loop = styleHasMechanic(profile, 'vengefulLoop') && critical && !profile.isCounterFollowup;
        state.counterReady = loop;
        state.counterFollowup = loop;
        state.counterStacks = 0;
        state.perfectCounter = false;
    }
    if (typeof refreshPlayerAttackInterval === 'function' && attacker === player) refreshPlayerAttackInterval();
}

function getPlayerAttackInterval(playerObject) {
    const attackSpeed = Math.max(0.01, Number(playerObject?.totalStats?.attackSpeed || 1));
    const profile = resolveSkillProfile(playerObject);
    const state = getCombatStyleState(playerObject);
    let multiplier = profile.attackTimeMultiplier;
    if (state.nextAttackHaste > 0) multiplier *= 1 - state.nextAttackHaste;
    if (styleHasMechanic(profile, 'siegeRhythm')) multiplier *= 1 - Math.min(0.24, state.consecutiveAttacks * 0.06);
    if (styleHasMechanic(profile, 'quickRiposte') && (state.counterReady || state.counterFollowup)) multiplier *= 0.75;
    return Math.max(0.1, (1 / attackSpeed) * multiplier);
}

function shouldProcOnHit(profile, trigger, hitIndex) {
    const rule = trigger === 'onCritical' ? profile.procOnCritical : profile.procOnHit;
    if (rule === 'none') return false;
    if (rule === 'firstHitOnly') return hitIndex === 0;
    if (rule === 'lastHitOnly') return hitIndex === profile.hitCount - 1;
    return true;
}

function modifyIncomingDamageForCombatStyle(defender, attacker, damageResult) {
    if (!defender || defender !== player || getEquippedSkillId(defender) !== 'counterStyle') return damageResult;
    const profile = resolveSkillProfile(defender);
    const state = getCombatStyleState(defender);
    let multiplier = 1;
    const incomingNumber = state.incomingCount + 1;
    if (styleHasMechanic(profile, 'bracedGuard') && !state.counterReady) multiplier *= 0.9;
    if (styleHasMechanic(profile, 'unbrokenForm') && state.counterReady) multiplier *= 0.8;
    if (styleHasMechanic(profile, 'perfectParry') && incomingNumber % 3 === 0) multiplier *= 0.6;
    return multiplier === 1 ? damageResult : scaleDamageResult(damageResult, multiplier);
}

function recordCombatStyleIncomingHit(defender) {
    if (!defender || defender !== player || getEquippedSkillId(defender) !== 'counterStyle') return;
    const profile = resolveSkillProfile(defender);
    const state = getCombatStyleState(defender);
    state.incomingCount++;
    const perfect = styleHasMechanic(profile, 'perfectParry') && state.incomingCount % 3 === 0;
    if (state.counterReady && styleHasMechanic(profile, 'storedForce')) state.counterStacks = Math.min(3, state.counterStacks + 1);
    state.counterReady = true;
    state.perfectCounter ||= perfect;
    if (typeof refreshPlayerAttackInterval === 'function') refreshPlayerAttackInterval();
}

function scaleDamageResult(damageResult, multiplier) {
    if (!damageResult || multiplier === 1) return damageResult;
    if (typeof isDamagePacket === 'function' && isDamagePacket(damageResult)) return scaleDamagePacket(damageResult, multiplier);
    const scaled = { ...damageResult, damageBreakdown: {}, damage: {} };
    const source = damageResult.damage || damageResult.damageBreakdown || {};
    for (const [type, amount] of Object.entries(source)) {
        const value = Math.max(0, Math.round(Number(amount || 0) * multiplier * 10) / 10);
        scaled.damage[type] = value;
        scaled.damageBreakdown[type] = value;
    }
    scaled.total = Math.round(Object.values(scaled.damage).reduce((sum, value) => sum + value, 0));
    return scaled;
}

function formatSkillProfileSummary(profile) {
    const multipliers = Array.isArray(profile.hitDamageMultipliers)
        ? profile.hitDamageMultipliers
        : Array.from({ length: profile.hitCount }, () => profile.damageMultiplier);
    const damage = multipliers.map(value => `${Math.round(value * 100)}%`).join(' + ');
    return `${profile.attackTimeMultiplier.toFixed(2)}x interval · ${profile.hitCount} hit${profile.hitCount > 1 ? 's' : ''} · ${damage} damage`;
}

function canChangeSkills() {
    const inCombat = typeof isCombatActive !== 'undefined' && isCombatActive;
    const inDelve = typeof isDelveInProgress !== 'undefined' && isDelveInProgress;
    return !inCombat && !inDelve;
}

function equipCombatSkill(playerObject, styleId) {
    if (!canChangeSkills()) return { ok: false, reason: 'Cannot change combat styles during combat or a delve.' };
    if (!playerObject) return { ok: false, reason: 'No player.' };
    normalizeCombatStylesState(playerObject);
    if (!playerObject.unlockedSkillIds.includes(styleId)) return { ok: false, reason: 'Combat style not unlocked.' };
    if (!getCombatStyles().some(style => style.id === styleId)) return { ok: false, reason: 'Unknown combat style.' };
    playerObject.equippedSkillId = styleId;
    resetCombatStyleState(playerObject);
    if (typeof playerObject.calculateStats === 'function') playerObject.calculateStats();
    if (typeof refreshPlayerAttackInterval === 'function') refreshPlayerAttackInterval();
    return { ok: true };
}

// Legacy mod APIs are intentionally inert.
function getSkillModAllocations() { return {}; }
function isSkillModAllocated() { return false; }
function canAllocateSkillMod() { return { ok: false, reason: 'Legacy skill mods are retired.' }; }
function allocateSkillMod() { return { ok: false, reason: 'Legacy skill mods are retired.' }; }
function deallocateSkillMod() { return { ok: false, reason: 'Legacy skill mods are retired.' }; }

Object.assign(window, {
    getSkillDefinition,
    getCombatStyleDefinition,
    getEquippedSkillId,
    resolveSkillProfile,
    prepareCombatStyleAttack,
    recordCombatStyleHit,
    finishCombatStyleAttack,
    resetCombatStyleState,
    getPlayerAttackInterval,
    shouldProcOnHit,
    buildHitContext,
    modifyIncomingDamageForCombatStyle,
    recordCombatStyleIncomingHit,
    scaleDamageResult,
    formatSkillProfileSummary,
    canChangeSkills,
    equipCombatSkill,
    getSkillModAllocations,
    isSkillModAllocated,
    canAllocateSkillMod,
    allocateSkillMod,
    deallocateSkillMod,
    getStylePointsForLevel,
    getStylePointSummary,
    getStyleNode,
    getStyleNodePoints,
    getStyleNodeStatus,
    getSelectedStyleChoice,
    canAllocateStyleNode,
    allocateStyleNode,
    canRefundStyleNode,
    refundStyleNode,
    refundAllStyleNodes,
    normalizeCombatStylesState,
    getUnlockedCombatStyleIds
});
