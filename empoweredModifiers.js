// Data-driven empowered-enemy modifiers. Combat, rewards, and UI all read
// these definitions so an empowered label always describes its real effects.
const EMPOWERED_REWARD_PER_MODIFIER = Object.freeze({
    experience: 0.40,
    feed: 0.40,
    materialChance: 0.30,
    materialPromotionChance: 0.12
});

const EMPOWERED_MODIFIER_DEFINITIONS = Object.freeze({
    giant: { id: 'giant', label: 'Giant', shortLabel: 'GNT', color: '#ff9f68', description: 'An additional +40% maximum Health.' },
    brutal: { id: 'brutal', label: 'Brutal', shortLabel: 'BRU', color: '#ff667d', description: 'An additional +40% damage.' },
    quick: { id: 'quick', label: 'Quick', shortLabel: 'QCK', color: '#ffe066', description: '+35% Attack Speed.' },
    regenerating: { id: 'regenerating', label: 'Regenerating', shortLabel: 'RGN', color: '#68f0a7', description: 'Restores 3% of maximum Health per second.' },
    barriered: { id: 'barriered', label: 'Barriered', shortLabel: 'BAR', color: '#70bfff', description: '+100% maximum Energy Shield. Unshielded enemies gain a barrier equal to 50% of maximum Health.' },
    precise: { id: 'precise', label: 'Precise', shortLabel: 'PRC', color: '#7df9ff', description: 'Gains level-scaled Precision and +12% Critical Chance.' },
    overcharged: { id: 'overcharged', label: 'Overcharged', shortLabel: 'OVR', color: '#b997ff', description: '+18% Critical Chance and +75% Critical Multiplier.' },
    vampiric: { id: 'vampiric', label: 'Vampiric', shortLabel: 'VMP', color: '#ff557d', description: 'Restores Health equal to 20% of damage dealt.' },
    elusive: { id: 'elusive', label: 'Elusive', shortLabel: 'ELU', color: '#a4f0ff', description: 'Gains a large, level-scaled amount of Deflection.' },
    frenzied: { id: 'frenzied', label: 'Frenzied', shortLabel: 'FRZ', color: '#ff8c42', description: 'Every 4 seconds gains +8% damage and +5% Attack Speed, up to five stacks.' },
    guardian: { id: 'guardian', label: 'Guardian', shortLabel: 'GRD', color: '#f6bd60', description: 'Intercepts 30% of direct damage dealt to another enemy.' },
    nullifying: { id: 'nullifying', label: 'Nullifying', shortLabel: 'NUL', color: '#64dfdf', description: 'Every 5 seconds removes one debuff from the most afflicted enemy.' },

    physicalResistant: { id: 'physicalResistant', label: 'Physical Resistant', shortLabel: 'PHY', color: '#c4ced1', description: 'Physical Resistance is at least 75%.' },
    elementalResistant: { id: 'elementalResistant', label: 'Elemental Resistant', shortLabel: 'ELM', color: '#75c9ff', description: 'Elemental Resistance is at least 75%.' },
    chemicalResistant: { id: 'chemicalResistant', label: 'Chemical Resistant', shortLabel: 'CHM', color: '#72df8a', description: 'Chemical Resistance is at least 75%.' },

    kineticInfused: { id: 'kineticInfused', label: 'Kinetic-Infused', shortLabel: 'KIN', color: '#b8c1c1', description: 'Adds level-scaled Kinetic damage and increases Kinetic damage by 35%.', infusionType: 'kinetic' },
    slashingInfused: { id: 'slashingInfused', label: 'Razor-Infused', shortLabel: 'SLA', color: '#d7b7d7', description: 'Adds level-scaled Slashing damage and increases Slashing damage by 35%.', infusionType: 'slashing' },
    pyroInfused: { id: 'pyroInfused', label: 'Pyro-Infused', shortLabel: 'PYR', color: '#ff6b6b', description: 'Adds level-scaled Pyro damage and increases Pyro damage by 35%.', infusionType: 'pyro' },
    cryoInfused: { id: 'cryoInfused', label: 'Cryo-Infused', shortLabel: 'CRY', color: '#7dd3fc', description: 'Adds level-scaled Cryo damage and increases Cryo damage by 35%.', infusionType: 'cryo' },
    electricInfused: { id: 'electricInfused', label: 'Storm-Infused', shortLabel: 'ELC', color: '#ffe066', description: 'Adds level-scaled Electric damage and increases Electric damage by 35%.', infusionType: 'electric' },
    corrosiveInfused: { id: 'corrosiveInfused', label: 'Caustic-Infused', shortLabel: 'COR', color: '#58d68d', description: 'Adds level-scaled Corrosive damage and increases Corrosive damage by 35%.', infusionType: 'corrosive' },
    radiationInfused: { id: 'radiationInfused', label: 'Isotope-Infused', shortLabel: 'RAD', color: '#b084f5', description: 'Adds level-scaled Radiation damage and increases Radiation damage by 35%.', infusionType: 'radiation' },

    hasteAura: { id: 'hasteAura', label: 'Haste Aura', shortLabel: 'HST', color: '#ffe066', description: 'Aura: the squad gains +20% Attack Speed.', aura: true },
    warAura: { id: 'warAura', label: 'War Aura', shortLabel: 'WAR', color: '#ff667d', description: 'Aura: the squad gains +20% damage.', aura: true },
    mendingAura: { id: 'mendingAura', label: 'Mending Aura', shortLabel: 'MND', color: '#68f0a7', description: 'Aura: the squad restores 1.25% maximum Health per second.', aura: true },
    barrierAura: { id: 'barrierAura', label: 'Barrier Aura', shortLabel: 'SHD', color: '#70bfff', description: 'Aura: the squad gains +25% maximum Energy Shield and restores 4% Energy Shield per second.', aura: true },
    targetingAura: { id: 'targetingAura', label: 'Targeting Aura', shortLabel: 'TGT', color: '#7df9ff', description: 'Aura: the squad gains level-scaled Precision and +10% Critical Chance.', aura: true },
    fortificationAura: { id: 'fortificationAura', label: 'Fortification Aura', shortLabel: 'FOR', color: '#f6bd60', description: 'Aura: the squad gains +15% to all Resistances.', aura: true },
    cleansingAura: { id: 'cleansingAura', label: 'Cleansing Aura', shortLabel: 'CLN', color: '#64dfdf', description: 'Aura: every 6 seconds removes one debuff from every enemy.', aura: true },
    suppressionAura: { id: 'suppressionAura', label: 'Suppression Aura', shortLabel: 'SUP', color: '#ff9f68', description: 'Aura: reduces the player\'s Attack Speed by 15%.', aura: true },
    disruptionAura: { id: 'disruptionAura', label: 'Disruption Aura', shortLabel: 'DIS', color: '#b997ff', description: 'Aura: reduces the player\'s Health and Energy Shield regeneration by 50%.', aura: true },
    escalationAura: { id: 'escalationAura', label: 'Escalation Aura', shortLabel: 'ESC', color: '#ff8c42', description: 'Aura: every 5 seconds the squad gains +6% damage, up to five stacks.', aura: true }
});

const EMPOWERED_MODIFIER_IDS = Object.freeze(Object.keys(EMPOWERED_MODIFIER_DEFINITIONS));

function getEmpoweredModifierDefinition(modifierId) {
    return EMPOWERED_MODIFIER_DEFINITIONS[String(modifierId || '')] || null;
}

function getEmpoweredModifierDefinitions(combatant) {
    return (Array.isArray(combatant?.empoweredModifierIds) ? combatant.empoweredModifierIds : [])
        .map(getEmpoweredModifierDefinition)
        .filter(Boolean);
}

function hasEmpoweredModifier(combatant, modifierId) {
    return Array.isArray(combatant?.empoweredModifierIds) && combatant.empoweredModifierIds.includes(modifierId);
}

function rollEmpoweredModifierIds(options = {}) {
    const random = typeof options.random === 'function' ? options.random : Math.random;
    const doubleChance = options.deepSector ? 0.15 : 0.10;
    const count = random() < doubleChance ? 2 : 1;
    const pool = [...EMPOWERED_MODIFIER_IDS];
    const selected = [];
    while (selected.length < count && pool.length > 0) {
        const index = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)));
        selected.push(pool.splice(index, 1)[0]);
    }
    return selected;
}

function normalizeEmpoweredModifierIds(ids) {
    return [...new Set(Array.isArray(ids) ? ids : [])]
        .filter(id => Boolean(getEmpoweredModifierDefinition(id)))
        .slice(0, 2);
}

function initializeEmpoweredModifierState(combatant) {
    const existing = combatant?._empoweredModifierState || {};
    if (!combatant) return null;
    combatant._empoweredModifierState = {
        frenziedElapsed: Math.max(0, Number(existing.frenziedElapsed) || 0),
        frenziedStacks: Math.max(0, Math.min(5, Math.floor(Number(existing.frenziedStacks) || 0))),
        escalationElapsed: Math.max(0, Number(existing.escalationElapsed) || 0),
        escalationStacks: Math.max(0, Math.min(5, Math.floor(Number(existing.escalationStacks) || 0))),
        nullifyElapsed: Math.max(0, Number(existing.nullifyElapsed) || 0),
        cleanseElapsed: Math.max(0, Number(existing.cleanseElapsed) || 0),
        auraPulseElapsedById: existing.auraPulseElapsedById && typeof existing.auraPulseElapsedById === 'object'
            ? { ...existing.auraPulseElapsedById }
            : {},
        healTextElapsed: Math.max(0, Number(existing.healTextElapsed) || 0),
        healTextAmount: Math.max(0, Number(existing.healTextAmount) || 0)
    };
    return combatant._empoweredModifierState;
}

function applyEmpoweredBaseModifiers(combatant, options = {}) {
    if (!combatant) return combatant;
    const random = typeof options.random === 'function' ? options.random : Math.random;
    const explicit = normalizeEmpoweredModifierIds(options.modifierIds);
    const ids = explicit.length > 0 ? explicit : rollEmpoweredModifierIds({ random, deepSector: Boolean(options.deepSector) });
    combatant.isEmpowered = true;
    combatant.empoweredModifierIds = ids;
    const definitions = getEmpoweredModifierDefinitions(combatant);
    const modifierCount = definitions.length;
    const originalHealth = Math.max(1, Number(combatant.health) || 1);
    const originalShield = Math.max(0, Number(combatant.energyShield) || 0);
    const originalDamage = { ...(combatant.damageTypes || {}) };
    const originalTotalDamage = Object.values(originalDamage).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    const has = id => ids.includes(id);

    combatant.health = Math.max(1, Math.round(originalHealth * (1 + modifierCount * 0.40 + (has('giant') ? 0.40 : 0))));
    combatant.energyShield = Math.max(0, Math.round(originalShield * (1 + modifierCount * 0.40)));
    combatant.damageTypes = Object.fromEntries(Object.entries(originalDamage).map(([type, amount]) => [
        type,
        Math.max(0, Number(amount) || 0) * (1 + modifierCount * 0.40 + (has('brutal') ? 0.40 : 0))
    ]));

    for (const definition of definitions.filter(entry => entry.infusionType)) {
        const type = definition.infusionType;
        const infusedBase = Math.max(0, Number(combatant.damageTypes[type]) || 0) + originalTotalDamage * 0.25;
        combatant.damageTypes[type] = infusedBase * 1.35;
    }
    for (const type of Object.keys(combatant.damageTypes)) {
        combatant.damageTypes[type] = Math.max(1, Math.round(combatant.damageTypes[type]));
    }

    if (has('barriered')) {
        combatant.energyShield = originalShield > 0
            ? Math.max(1, Math.round(combatant.energyShield + originalShield))
            : Math.max(1, Math.round(combatant.health * 0.50));
    }
    if (has('precise')) {
        combatant.precision = Number(combatant.precision || 0) + Math.max(20, Number(combatant.level || 1) * 4);
        combatant.criticalChance = Number(combatant.criticalChance || 0) + 0.12;
    }
    if (has('overcharged')) {
        combatant.criticalChance = Number(combatant.criticalChance || 0) + 0.18;
        combatant.criticalMultiplier = Number(combatant.criticalMultiplier || 1.5) + 0.75;
    }
    if (has('elusive')) combatant.deflection = Number(combatant.deflection || 0) + Math.max(20, Number(combatant.level || 1) * 4);
    combatant.defenseTypes = { physicalResistance: 0, elementalResistance: 0, chemicalResistance: 0, ...(combatant.defenseTypes || {}) };
    if (has('physicalResistant')) combatant.defenseTypes.physicalResistance = Math.max(75, Number(combatant.defenseTypes.physicalResistance) || 0);
    if (has('elementalResistant')) combatant.defenseTypes.elementalResistance = Math.max(75, Number(combatant.defenseTypes.elementalResistance) || 0);
    if (has('chemicalResistant')) combatant.defenseTypes.chemicalResistance = Math.max(75, Number(combatant.defenseTypes.chemicalResistance) || 0);
    combatant._empoweredOriginalStats = { health: originalHealth, energyShield: originalShield, damageTypes: originalDamage };
    initializeEmpoweredModifierState(combatant);
    return combatant;
}

function getEmpoweredModifierCount(combatant) {
    return getEmpoweredModifierDefinitions(combatant).length;
}

function getEmpoweredRewardProfile(combatant, options = {}) {
    const count = getEmpoweredModifierCount(combatant);
    const playerLevel = Number(options.playerLevel ?? (typeof player !== 'undefined' ? player?.level : 1)) || 1;
    return {
        modifierCount: count,
        experienceMultiplier: playerLevel < 50 ? 1 + count * EMPOWERED_REWARD_PER_MODIFIER.experience : 1,
        feedMultiplier: 1 + count * EMPOWERED_REWARD_PER_MODIFIER.feed,
        materialChanceMultiplier: 1 + count * EMPOWERED_REWARD_PER_MODIFIER.materialChance,
        materialPromotionChance: Math.min(1, count * EMPOWERED_REWARD_PER_MODIFIER.materialPromotionChance)
    };
}

function getActiveEmpoweredAuraSources() {
    const living = typeof getLivingEnemies === 'function' ? getLivingEnemies() : [];
    const sources = new Map();
    for (const candidate of living) {
        for (const definition of getEmpoweredModifierDefinitions(candidate)) {
            if (definition.aura && !sources.has(definition.id)) sources.set(definition.id, candidate);
        }
    }
    return sources;
}

function getActiveEmpoweredAuraDefinitions() {
    return [...getActiveEmpoweredAuraSources().keys()].map(getEmpoweredModifierDefinition).filter(Boolean);
}

function getActiveEmpoweredAuraIds() {
    return [...getActiveEmpoweredAuraSources().keys()];
}

function applyEmpoweredModifierStatModifiers(combatant, stats) {
    if (!combatant || !stats) return stats;
    if (hasEmpoweredModifier(combatant, 'quick')) stats.attackSpeed *= 1.35;
    if (hasEmpoweredModifier(combatant, 'frenzied')) {
        const stacks = Math.max(0, Number(combatant._empoweredModifierState?.frenziedStacks) || 0);
        stats.attackSpeed *= 1 + stacks * 0.05;
        for (const type of Object.keys(stats.damageTypes || {})) stats.damageTypes[type] *= 1 + stacks * 0.08;
    }

    const auraSources = getActiveEmpoweredAuraSources();
    if (auraSources.has('hasteAura')) stats.attackSpeed *= 1.20;
    if (auraSources.has('warAura')) {
        for (const type of Object.keys(stats.damageTypes || {})) stats.damageTypes[type] *= 1.20;
    }
    if (auraSources.has('barrierAura')) {
        const currentShield = Math.max(0, Number(stats.energyShield) || 0);
        stats.energyShield = currentShield > 0
            ? currentShield * 1.25
            : Math.max(1, Number(stats.health || 1) * 0.10);
    }
    if (auraSources.has('targetingAura')) {
        stats.precision += Math.max(10, Number(combatant.level || 1) * 2);
        stats.criticalChance += 0.10;
    }
    if (auraSources.has('fortificationAura')) {
        for (const resistance of ['physicalResistance', 'elementalResistance', 'chemicalResistance']) {
            stats.defenseTypes[resistance] = (Number(stats.defenseTypes[resistance]) || 0) + 15;
        }
    }
    const escalationSource = auraSources.get('escalationAura');
    if (escalationSource) {
        const stacks = Math.max(0, Number(escalationSource._empoweredModifierState?.escalationStacks) || 0);
        for (const type of Object.keys(stats.damageTypes || {})) stats.damageTypes[type] *= 1 + stacks * 0.06;
    }

    for (const resistance of ['physicalResistance', 'elementalResistance', 'chemicalResistance']) {
        stats.defenseTypes[resistance] = Math.min(80, Math.max(0, Number(stats.defenseTypes[resistance]) || 0));
    }
    return stats;
}

function getEmpoweredPlayerAttackSpeedMultiplier() {
    return getActiveEmpoweredAuraSources().has('suppressionAura') ? 0.85 : 1;
}

function getEmpoweredPlayerRegenMultiplier() {
    return getActiveEmpoweredAuraSources().has('disruptionAura') ? 0.50 : 1;
}

function getEmpoweredModifierTooltip(definition) {
    if (!definition) return '';
    return `${definition.label}: ${definition.description}\nPer modifier rewards: +40% Feed, +30% material drop chance, +12% material tier promotion chance, and +40% XP below level 50.`;
}

window.empoweredModifierDefinitions = EMPOWERED_MODIFIER_DEFINITIONS;
window.getEmpoweredModifierDefinition = getEmpoweredModifierDefinition;
window.getEmpoweredModifierDefinitions = getEmpoweredModifierDefinitions;
window.hasEmpoweredModifier = hasEmpoweredModifier;
window.rollEmpoweredModifierIds = rollEmpoweredModifierIds;
window.applyEmpoweredBaseModifiers = applyEmpoweredBaseModifiers;
window.initializeEmpoweredModifierState = initializeEmpoweredModifierState;
window.getEmpoweredModifierCount = getEmpoweredModifierCount;
window.getEmpoweredRewardProfile = getEmpoweredRewardProfile;
window.getActiveEmpoweredAuraSources = getActiveEmpoweredAuraSources;
window.getActiveEmpoweredAuraDefinitions = getActiveEmpoweredAuraDefinitions;
window.getActiveEmpoweredAuraIds = getActiveEmpoweredAuraIds;
window.applyEmpoweredModifierStatModifiers = applyEmpoweredModifierStatModifiers;
window.getEmpoweredPlayerAttackSpeedMultiplier = getEmpoweredPlayerAttackSpeedMultiplier;
window.getEmpoweredPlayerRegenMultiplier = getEmpoweredPlayerRegenMultiplier;
window.getEmpoweredModifierTooltip = getEmpoweredModifierTooltip;
