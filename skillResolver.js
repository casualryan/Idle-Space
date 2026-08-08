// Combat Style resolver + tree point allocation rules.

function getCombatStyles() {
    return window.combatStyles || window.combatSkills || [];
}

function getDefaultCombatStyleId() {
    return window.DEFAULT_COMBAT_STYLE_ID || 'balancedStyle';
}

function getLegacySkillIds() {
    return window.LEGACY_SKILL_IDS || [];
}

function getSkillDefinition(styleId) {
    const styles = getCombatStyles();
    return styles.find((s) => s.id === styleId) || styles.find((s) => s.id === getDefaultCombatStyleId()) || styles[0] || null;
}

function getCombatStyleDefinition(styleId) {
    return getSkillDefinition(styleId);
}

function getEquippedSkillId(player) {
    if (!player) return getDefaultCombatStyleId();
    const id = player.equippedSkillId;
    const def = getSkillDefinition(id);
    return def ? def.id : getDefaultCombatStyleId();
}

function getStylePointsForLevel(level) {
    const thresholds = window.STYLE_POINT_THRESHOLDS || [6, 11, 16, 21, 26, 31, 36, 41, 46, 51];
    return thresholds.reduce((count, t) => count + (level >= t ? 1 : 0), 0);
}

function getStyleNextPointLevel(level) {
    const thresholds = window.STYLE_POINT_THRESHOLDS || [6, 11, 16, 21, 26, 31, 36, 41, 46, 51];
    return thresholds.find((t) => level < t) || null;
}

function getUnlockedCombatStyleIds() {
    return getCombatStyles().map((s) => s.id);
}

function ensureCombatStyleAllocations(player) {
    if (!player.combatStyleAllocations || typeof player.combatStyleAllocations !== 'object') {
        player.combatStyleAllocations = {};
    }
    const styles = getCombatStyles();
    for (const style of styles) {
        if (!player.combatStyleAllocations[style.id] || typeof player.combatStyleAllocations[style.id] !== 'object') {
            player.combatStyleAllocations[style.id] = { nodes: {} };
        }
        if (!player.combatStyleAllocations[style.id].nodes || typeof player.combatStyleAllocations[style.id].nodes !== 'object') {
            player.combatStyleAllocations[style.id].nodes = {};
        }
    }
}

function normalizeCombatStylesState(player) {
    if (!player) return;

    const styles = getCombatStyles();
    const styleIds = styles.map((s) => s.id);
    const defaultStyleId = getDefaultCombatStyleId();
    const legacyIds = new Set(getLegacySkillIds());

    const unlocked = Array.isArray(player.unlockedSkillIds) ? player.unlockedSkillIds.filter((id) => styleIds.includes(id)) : [];
    player.unlockedSkillIds = unlocked.length ? unlocked : [...styleIds];

    if (!styleIds.includes(player.equippedSkillId) || legacyIds.has(player.equippedSkillId)) {
        player.equippedSkillId = defaultStyleId;
    }

    ensureCombatStyleAllocations(player);

    for (const style of styles) {
        const nodesMap = player.combatStyleAllocations[style.id].nodes;
        const validNodes = new Map((style.tree?.nodes || []).map((n) => [n.id, n]));

        for (const nodeId of Object.keys(nodesMap)) {
            const node = validNodes.get(nodeId);
            if (!node) {
                delete nodesMap[nodeId];
                continue;
            }
            const maxPoints = Math.max(1, node.maxPoints || 1);
            let value = Number(nodesMap[nodeId]) || 0;
            value = Math.max(0, Math.min(maxPoints, value));
            if (value <= 0) {
                delete nodesMap[nodeId];
            } else {
                nodesMap[nodeId] = value;
            }
        }
    }

    // Keep legacy fields inert for compatibility; they are no longer used.
    if (!player.skillModAllocations || typeof player.skillModAllocations !== 'object') {
        player.skillModAllocations = {};
    }
    if (typeof player.skillPoints !== 'number') {
        player.skillPoints = 0;
    }
}

function getStyleNode(styleId, nodeId) {
    const style = getSkillDefinition(styleId);
    if (!style || !style.tree || !Array.isArray(style.tree.nodes)) return null;
    return style.tree.nodes.find((node) => node.id === nodeId) || null;
}

function getStyleNodePoints(player, styleId, nodeId) {
    ensureCombatStyleAllocations(player);
    return Number(player.combatStyleAllocations[styleId]?.nodes?.[nodeId] || 0);
}

function isStyleNodePurchased(player, styleId, nodeId) {
    return getStyleNodePoints(player, styleId, nodeId) > 0;
}

function getStyleSpentPoints(player, styleId) {
    const style = getSkillDefinition(styleId);
    if (!style) return 0;
    ensureCombatStyleAllocations(player);
    const allocations = player.combatStyleAllocations[styleId]?.nodes || {};
    let spent = 0;
    for (const node of style.tree.nodes || []) {
        const count = Number(allocations[node.id] || 0);
        if (count <= 0) continue;
        spent += count * Math.max(1, node.cost || 1);
    }
    return spent;
}

function getStylePointSummary(player, styleId) {
    const earned = getStylePointsForLevel(player?.level || 1);
    const spent = getStyleSpentPoints(player, styleId);
    const available = Math.max(0, earned - spent);
    return {
        earned,
        spent,
        available,
        max: (window.STYLE_POINT_THRESHOLDS || []).length || 10,
        nextPointLevel: getStyleNextPointLevel(player?.level || 1),
    };
}

function areStyleNodeRequirementsMet(player, styleId, node) {
    for (const reqId of node.requires || []) {
        if (!isStyleNodePurchased(player, styleId, reqId)) {
            return false;
        }
    }
    return true;
}

function getBlockingMutualNode(player, styleId, node) {
    for (const exId of node.mutuallyExclusiveWith || []) {
        if (isStyleNodePurchased(player, styleId, exId)) {
            return exId;
        }
    }
    return null;
}

function canAllocateStyleNode(player, styleId, nodeId) {
    if (!player) return { ok: false, reason: 'No player.' };
    if (!canChangeSkills()) return { ok: false, reason: 'Cannot modify combat styles during combat or a delve.' };

    normalizeCombatStylesState(player);
    const style = getSkillDefinition(styleId);
    if (!style) return { ok: false, reason: 'Unknown combat style.' };
    const node = getStyleNode(styleId, nodeId);
    if (!node) return { ok: false, reason: 'Unknown style node.' };

    const summary = getStylePointSummary(player, styleId);
    const cost = Math.max(1, node.cost || 1);
    if (summary.available < cost) return { ok: false, reason: 'No style points available.' };

    const points = getStyleNodePoints(player, styleId, nodeId);
    const maxPoints = Math.max(1, node.maxPoints || 1);
    if (points >= maxPoints) return { ok: false, reason: 'Node is already at max points.' };

    if (!areStyleNodeRequirementsMet(player, styleId, node)) {
        return { ok: false, reason: 'Locked: prerequisites not met.' };
    }

    const blockedBy = getBlockingMutualNode(player, styleId, node);
    if (blockedBy) {
        return { ok: false, reason: `Blocked by ${blockedBy}.` };
    }

    return { ok: true };
}

function allocateStyleNode(player, styleId, nodeId) {
    const check = canAllocateStyleNode(player, styleId, nodeId);
    if (!check.ok) return check;

    const current = getStyleNodePoints(player, styleId, nodeId);
    player.combatStyleAllocations[styleId].nodes[nodeId] = current + 1;
    return { ok: true };
}

function canRefundStyleNode(player, styleId, nodeId) {
    if (!player) return { ok: false, reason: 'No player.' };
    if (!canChangeSkills()) return { ok: false, reason: 'Cannot modify combat styles during combat or a delve.' };

    normalizeCombatStylesState(player);
    const style = getSkillDefinition(styleId);
    if (!style) return { ok: false, reason: 'Unknown combat style.' };
    const node = getStyleNode(styleId, nodeId);
    if (!node) return { ok: false, reason: 'Unknown style node.' };

    const points = getStyleNodePoints(player, styleId, nodeId);
    if (points <= 0) return { ok: false, reason: 'Node has no allocated points.' };

    for (const candidate of style.tree.nodes || []) {
        if (!candidate.requires || !candidate.requires.includes(nodeId)) continue;
        if (isStyleNodePurchased(player, styleId, candidate.id)) {
            return { ok: false, reason: 'Cannot refund: dependent nodes are purchased.' };
        }
    }

    return { ok: true };
}

function refundStyleNode(player, styleId, nodeId) {
    const check = canRefundStyleNode(player, styleId, nodeId);
    if (!check.ok) return check;

    const current = getStyleNodePoints(player, styleId, nodeId);
    const next = Math.max(0, current - 1);
    if (next <= 0) {
        delete player.combatStyleAllocations[styleId].nodes[nodeId];
    } else {
        player.combatStyleAllocations[styleId].nodes[nodeId] = next;
    }
    return { ok: true };
}

function refundAllStyleNodes(player, styleId) {
    if (!player) return { ok: false, reason: 'No player.' };
    if (!canChangeSkills()) return { ok: false, reason: 'Cannot modify combat styles during combat or a delve.' };
    normalizeCombatStylesState(player);
    if (!player.combatStyleAllocations[styleId]) return { ok: false, reason: 'Unknown combat style.' };
    player.combatStyleAllocations[styleId].nodes = {};
    return { ok: true };
}

function getStyleNodeStatus(player, styleId, nodeId) {
    const node = getStyleNode(styleId, nodeId);
    if (!node) return { status: 'locked', reason: 'Unknown node.' };
    const points = getStyleNodePoints(player, styleId, nodeId);
    if (points > 0) return { status: 'purchased', reason: 'Purchased' };
    if (!areStyleNodeRequirementsMet(player, styleId, node)) {
        return { status: 'locked', reason: 'Locked: prerequisites not met.' };
    }
    const blockedBy = getBlockingMutualNode(player, styleId, node);
    if (blockedBy) {
        return { status: 'blocked', reason: `Blocked by ${blockedBy}.` };
    }
    const allocCheck = canAllocateStyleNode(player, styleId, nodeId);
    if (allocCheck.ok) return { status: 'available', reason: 'Available' };
    return { status: 'locked', reason: allocCheck.reason || 'Locked' };
}

function resolveSkillProfile(player) {
    const styleId = getEquippedSkillId(player);
    const style = getSkillDefinition(styleId);
    const base = style ? { ...(style.base || {}) } : { ...(window.DEFAULT_COMBAT_STYLE_PROFILE || window.DEFAULT_SKILL_PROFILE || {}) };

    // TODO: tree node stat effects intentionally deferred for this prototype.
    const profile = {
        skillId: styleId,
        displayName: style ? style.name : 'Balanced Style',
        attackTimeMultiplier: Math.max(0.1, base.attackTimeMultiplier ?? 1),
        damageMultiplier: Math.max(0, base.damageMultiplier ?? 1),
        hitCount: Math.max(1, Math.floor(base.hitCount ?? 1)),
        procOnHit: base.procOnHit || 'allHits',
        procOnCritical: base.procOnCritical || 'allHits',
        comboAfterSkill: base.comboAfterSkill !== false,
        comboProcStrength: base.comboProcStrength ?? 0,
        critChanceMultiplier: base.critChanceMultiplier ?? 1,
        critChanceBonus: base.critChanceBonus ?? 0,
        debuffApplyBonus: base.debuffApplyBonus ?? 0,
    };

    return profile;
}

function getPlayerAttackInterval(player) {
    const attackSpeed = player?.totalStats?.attackSpeed || 1;
    const profile = resolveSkillProfile(player);
    return (1 / attackSpeed) * profile.attackTimeMultiplier;
}

function shouldProcOnHit(profile, trigger, hitIndex) {
    const rule = trigger === 'onCritical' ? profile.procOnCritical : profile.procOnHit;
    switch (rule) {
        case 'none':
            return false;
        case 'firstHitOnly':
            return hitIndex === 0;
        case 'lastHitOnly':
            return hitIndex === profile.hitCount - 1;
        case 'allHits':
        default:
            return true;
    }
}

function buildHitContext(profile, hitIndex) {
    return {
        hitIndex,
        damageMultiplier: profile.damageMultiplier,
        critChanceMultiplier: profile.critChanceMultiplier,
        critChanceBonus: profile.critChanceBonus,
        forceCrit: false,
        skipCrit: false,
        debuffApplyBonus: profile.debuffApplyBonus,
    };
}

function scaleDamageResult(damageResult, multiplier) {
    if (!damageResult || multiplier === 1) return damageResult;
    if (typeof isDamagePacket === 'function' && isDamagePacket(damageResult)) {
        return scaleDamagePacket(damageResult, multiplier);
    }
    const scaled = {
        total: Math.round((damageResult.total || 0) * multiplier),
        damageBreakdown: {},
        isCritical: damageResult.isCritical,
    };
    for (const type in damageResult.damageBreakdown || {}) {
        scaled.damageBreakdown[type] = Math.round((damageResult.damageBreakdown[type] || 0) * multiplier * 10) / 10;
    }
    scaled.total = Math.round(Object.values(scaled.damageBreakdown).reduce((sum, v) => sum + v, 0));
    return scaled;
}

function formatSkillProfileSummary(profile) {
    const spd = profile.attackTimeMultiplier;
    const dmg = Math.round(profile.damageMultiplier * 100);
    const hits = profile.hitCount;
    return `${spd.toFixed(2)}x speed · ${hits} hit${hits > 1 ? 's' : ''} · ${dmg}% damage`;
}

function canChangeSkills() {
    const inCombat = typeof isCombatActive !== 'undefined' && isCombatActive;
    const inDelve = typeof isDelveInProgress !== 'undefined' && isDelveInProgress;
    return !inCombat && !inDelve;
}

function equipCombatSkill(player, styleId) {
    if (!canChangeSkills()) {
        return { ok: false, reason: 'Cannot change combat styles during combat or a delve.' };
    }
    if (!player) return { ok: false, reason: 'No player.' };

    normalizeCombatStylesState(player);
    const unlocked = player.unlockedSkillIds || [];
    if (!unlocked.includes(styleId)) {
        return { ok: false, reason: 'Combat style not unlocked.' };
    }
    if (!getSkillDefinition(styleId)) {
        return { ok: false, reason: 'Unknown combat style.' };
    }

    player.equippedSkillId = styleId;
    if (typeof refreshPlayerAttackInterval === 'function') {
        refreshPlayerAttackInterval();
    }
    return { ok: true };
}

// Legacy mod APIs are deprecated and intentionally disabled.
function getSkillModAllocations() { return {}; }
function isSkillModAllocated() { return false; }
function canAllocateSkillMod() { return { ok: false, reason: 'Legacy skill mods are deprecated.' }; }
function allocateSkillMod() { return { ok: false, reason: 'Legacy skill mods are deprecated.' }; }
function deallocateSkillMod() { return { ok: false, reason: 'Legacy skill mods are deprecated.' }; }

window.getSkillDefinition = getSkillDefinition;
window.getCombatStyleDefinition = getCombatStyleDefinition;
window.getEquippedSkillId = getEquippedSkillId;
window.resolveSkillProfile = resolveSkillProfile;
window.getPlayerAttackInterval = getPlayerAttackInterval;
window.shouldProcOnHit = shouldProcOnHit;
window.buildHitContext = buildHitContext;
window.scaleDamageResult = scaleDamageResult;
window.formatSkillProfileSummary = formatSkillProfileSummary;
window.canAllocateSkillMod = canAllocateSkillMod;
window.allocateSkillMod = allocateSkillMod;
window.deallocateSkillMod = deallocateSkillMod;
window.isSkillModAllocated = isSkillModAllocated;
window.canChangeSkills = canChangeSkills;
window.equipCombatSkill = equipCombatSkill;
window.getSkillModAllocations = getSkillModAllocations;

window.getStylePointsForLevel = getStylePointsForLevel;
window.getStylePointSummary = getStylePointSummary;
window.getStyleNode = getStyleNode;
window.getStyleNodePoints = getStyleNodePoints;
window.getStyleNodeStatus = getStyleNodeStatus;
window.canAllocateStyleNode = canAllocateStyleNode;
window.allocateStyleNode = allocateStyleNode;
window.canRefundStyleNode = canRefundStyleNode;
window.refundStyleNode = refundStyleNode;
window.refundAllStyleNodes = refundAllStyleNodes;
window.normalizeCombatStylesState = normalizeCombatStylesState;
window.getUnlockedCombatStyleIds = getUnlockedCombatStyleIds;
