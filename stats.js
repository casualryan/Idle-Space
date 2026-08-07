// stats.js - Consolidated stat and damage calculation logic

// --- Moved from global.js ---

const DAMAGE_TYPE_TO_GROUP = {
    kinetic: 'physical',
    slashing: 'physical',
    pyro: 'elemental',
    cryo: 'elemental',
    electric: 'elemental',
    corrosive: 'chemical',
    radiation: 'chemical'
};

const DAMAGE_GROUP_TO_TYPES = {
    physical: ['kinetic', 'slashing'],
    elemental: ['pyro', 'cryo', 'electric'],
    chemical: ['corrosive', 'radiation']
};

const LEGACY_DAMAGE_TYPE_MAP = {
    mental: 'slashing',
    magnetic: 'electric',
    chemical: 'corrosive'
};

function normalizeDamageTypeKey(type) {
    return LEGACY_DAMAGE_TYPE_MAP[type] || type;
}

function getWeaponBaseDamageMap(item) {
    if (!item || typeof item !== 'object') return {};
    const source = item.weaponBaseDamage || item.baseDamageTypes || item.damageTypes || {};
    const normalized = {};
    Object.keys(source).forEach((rawType) => {
        const type = normalizeDamageTypeKey(rawType);
        if (!DAMAGE_TYPE_TO_GROUP[type]) return;
        const value = source[rawType];
        if (typeof value === 'number') {
            normalized[type] = { min: value, max: value };
            return;
        }
        if (value && typeof value === 'object') {
            const min = Number(value.min);
            const max = Number(value.max);
            if (Number.isFinite(min) || Number.isFinite(max)) {
                const safeMin = Number.isFinite(min) ? min : (Number.isFinite(max) ? max : 0);
                const safeMax = Number.isFinite(max) ? max : safeMin;
                normalized[type] = {
                    min: Math.min(safeMin, safeMax),
                    max: Math.max(safeMin, safeMax)
                };
            }
        }
    });
    return normalized;
}

function getWeaponBaseGroups(baseDamageMap) {
    const groups = new Set();
    Object.keys(baseDamageMap).forEach((type) => {
        const group = DAMAGE_TYPE_TO_GROUP[type];
        if (group) groups.add(group);
    });
    return groups;
}

function isDamageTypeInAllowedWeaponPool(type, baseGroups) {
    const group = DAMAGE_TYPE_TO_GROUP[type];
    return Boolean(group && baseGroups.has(group));
}

function addRangeDamageEntry(target, type, range) {
    if (!target[type]) target[type] = { min: 0, max: 0 };
    target[type].min += Number(range.min || 0);
    target[type].max += Number(range.max || 0);
}

function computeWeaponLocalProfile(item) {
    const profile = {
        baseDamage: getWeaponBaseDamageMap(item),
        finalDamage: {},
        finalFlatDamage: {},
        conversion: null,
        localAttackSpeedMultiplier: 1,
        localAttackSpeedPercent: 0
    };

    const hasLegacyDamageTypes = Boolean(item?.damageTypes && Object.keys(item.damageTypes).length > 0);
    if (item?.weaponBaseDamage && hasLegacyDamageTypes) {
        console.warn(`Weapon ${item?.name || 'Unknown'} has both weaponBaseDamage and legacy damageTypes; legacy damageTypes will not be treated as base.`);
    }
    const baseGroups = getWeaponBaseGroups(profile.baseDamage);
    if (Object.keys(profile.baseDamage).length === 0) {
        console.warn(`Weapon ${item?.name || 'Unknown'} has no usable weapon base damage.`);
    }
    const working = {};
    Object.keys(profile.baseDamage).forEach((type) => {
        addRangeDamageEntry(working, type, profile.baseDamage[type]);
    });

    const flatLocal = item?.weaponLocalFlatDamage || {};
    Object.keys(flatLocal).forEach((rawType) => {
        const type = normalizeDamageTypeKey(rawType);
        if (!DAMAGE_TYPE_TO_GROUP[type]) return;
        const flat = Number(flatLocal[rawType]);
        if (!Number.isFinite(flat) || flat === 0) return;
        if (!isDamageTypeInAllowedWeaponPool(type, baseGroups)) {
            console.warn(`Illegal local flat damage pool on ${item?.name || 'weapon'}: ${type}`);
            return;
        }
        addRangeDamageEntry(working, type, { min: flat, max: flat });
    });

    const conversion = item?.weaponDamageConversion;
    if (conversion && typeof conversion === 'object') {
        const source = normalizeDamageTypeKey(conversion.source);
        const target = normalizeDamageTypeKey(conversion.target);
        if (source && target && source !== target && DAMAGE_TYPE_TO_GROUP[source] && DAMAGE_TYPE_TO_GROUP[target] && working[source]) {
            const ratio = Number.isFinite(Number(conversion.percent))
                ? Math.max(0, Math.min(1, Number(conversion.percent) / 100))
                : 1;
            const moved = {
                min: working[source].min * ratio,
                max: working[source].max * ratio
            };
            working[source].min -= moved.min;
            working[source].max -= moved.max;
            addRangeDamageEntry(working, target, moved);
            profile.conversion = { source, target, percent: ratio * 100 };
        } else {
            console.warn(`Invalid weapon conversion on ${item?.name || 'weapon'}:`, conversion);
        }
    }

    const typeIncreases = item?.weaponLocalTypeIncrease || {};
    const groupIncreases = item?.weaponLocalGroupIncrease || {};
    Object.keys(working).forEach((type) => {
        const group = DAMAGE_TYPE_TO_GROUP[type];
        const typeIncPct = Number(typeIncreases[type] || 0);
        const groupIncPct = Number(groupIncreases[group] || 0);
        const totalInc = (Number.isFinite(typeIncPct) ? typeIncPct : 0) + (Number.isFinite(groupIncPct) ? groupIncPct : 0);
        const multiplier = 1 + (totalInc / 100);
        if (!Number.isFinite(multiplier) || multiplier < 0) {
            console.warn(`Invalid local damage multiplier on ${item?.name || 'weapon'} for ${type}`);
            return;
        }
        working[type].min *= multiplier;
        working[type].max *= multiplier;
    });

    Object.keys(working).forEach((type) => {
        const range = working[type];
        if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) {
            console.warn(`NaN local weapon damage on ${item?.name || 'weapon'} for ${type}`);
            return;
        }
        const safeMin = Math.max(0, range.min);
        const safeMax = Math.max(0, range.max);
        if (safeMin <= 0 && safeMax <= 0) return;
        profile.finalDamage[type] = {
            min: Number(safeMin.toFixed(2)),
            max: Number(safeMax.toFixed(2))
        };
        profile.finalFlatDamage[type] = Math.max(0, Math.round((safeMin + safeMax) / 2));
    });

    const localAttackSpeedPct = Number(item?.weaponLocalAttackSpeedPercent || 0);
    profile.localAttackSpeedPercent = Number.isFinite(localAttackSpeedPct) ? localAttackSpeedPct : 0;
    profile.localAttackSpeedMultiplier = 1 + (profile.localAttackSpeedPercent / 100);
    if (!Number.isFinite(profile.localAttackSpeedMultiplier) || profile.localAttackSpeedMultiplier <= 0) {
        console.warn(`Invalid local weapon attack speed modifier on ${item?.name || 'weapon'}`);
        profile.localAttackSpeedMultiplier = 1;
        profile.localAttackSpeedPercent = 0;
    }

    return profile;
}

window.computeWeaponLocalProfile = computeWeaponLocalProfile;

// Function to apply item modifiers to stats object
function applyItemModifiers(stats, item, options = {}) {
    // Apply flat damage types
    if (!stats || !item) return;
    const includeDamageTypes = options.includeDamageTypes !== false;
    const includeDamageModifiers = options.includeDamageModifiers !== false;

    // Flat Damage Types
    if (includeDamageTypes && item.damageTypes) {
        if (!stats.damageTypes) stats.damageTypes = {};
        for (let damageType in item.damageTypes) {
            const normalizedType = normalizeDamageTypeKey(damageType);
            if (!DAMAGE_TYPE_TO_GROUP[normalizedType]) continue;
            if (stats.damageTypes[normalizedType] === undefined) {
                stats.damageTypes[normalizedType] = 0;
            }
            let val = item.damageTypes[damageType];
            if (typeof val !== "number") { val = 0; }
            stats.damageTypes[normalizedType] += val;
        }
    }

    // Percentage Damage Modifiers - specific types
    if (includeDamageModifiers && item.statModifiers && item.statModifiers.damageTypes) {
        if (!stats.damageTypeModifiers) stats.damageTypeModifiers = {};
        for (let damageType in item.statModifiers.damageTypes) {
            const normalizedType = normalizeDamageTypeKey(damageType);
            if (!DAMAGE_TYPE_TO_GROUP[normalizedType]) continue;
            if (stats.damageTypeModifiers[normalizedType] === undefined) {
                stats.damageTypeModifiers[normalizedType] = 1; // Start at 100%
            }
            let modVal = item.statModifiers.damageTypes[damageType];
            if (typeof modVal !== "number") { modVal = 0; }
            // Apply additively (e.g., 1.0 + 0.15 for +15%)
            stats.damageTypeModifiers[normalizedType] += modVal / 100;
        }
    }

    // Percentage Damage Modifiers - group types
    if (includeDamageModifiers && item.statModifiers && item.statModifiers.damageGroups) {
        if (!stats.damageGroupModifiers) stats.damageGroupModifiers = {};

        // Initialize group modifiers if they don't exist
        const groups = ['physical', 'elemental', 'chemical'];
        for (const group of groups) {
            if (stats.damageGroupModifiers[group] === undefined) {
                stats.damageGroupModifiers[group] = 1; // Start at 100%
            }
        }

        // Apply group modifiers
        for (let group in item.statModifiers.damageGroups) {
            let modVal = item.statModifiers.damageGroups[group];
            if (typeof modVal !== "number") { modVal = 0; }
            // Apply additively
            stats.damageGroupModifiers[group] += modVal / 100;
        }
    }

    // Defense Types
    if (item.defenseTypes) {
        if (!stats.defenseTypes) stats.defenseTypes = {};
        for (let defenseType in item.defenseTypes) {
            if (stats.defenseTypes[defenseType] === undefined) {
                stats.defenseTypes[defenseType] = 0;
            }
            let defVal = item.defenseTypes[defenseType];
            if (typeof defVal !== "number") { defVal = 0; }
            stats.defenseTypes[defenseType] += defVal;
        }
    }

    // Health Bonus
    if (item.healthBonus !== undefined) {
        stats.healthBonus = (stats.healthBonus || 0) + item.healthBonus;
    }
    // Energy Shield Bonus
    if (item.energyShieldBonus !== undefined) {
        stats.energyShieldBonus = (stats.energyShieldBonus || 0) + item.energyShieldBonus;
    }
    // Percentage Health Bonus
    if (item.healthBonusPercent !== undefined) {
        stats.healthBonusPercent = (stats.healthBonusPercent || 0) + item.healthBonusPercent;
    }
    // Percentage Energy Shield Bonus
    if (item.energyShieldBonusPercent !== undefined) {
        stats.energyShieldBonusPercent = (stats.energyShieldBonusPercent || 0) + item.energyShieldBonusPercent;
    }
    // Attack Speed Modifier (flat percentage; e.g., 0.5 means +50%)
    // Note: This is handled separately in calculatePlayerStats for base speed calculation
    // if (item.attackSpeedModifier !== undefined) {
    //     stats.attackSpeedMultiplier *= (1 + item.attackSpeedModifier);
    // }
    // Critical Chance Modifier
    if (item.criticalChanceModifier !== undefined) {
        stats.criticalChance = (stats.criticalChance || 0) + item.criticalChanceModifier;
    }
    // Critical Multiplier Modifier
    if (item.criticalMultiplierModifier !== undefined) {
        // Note: Crit multiplier bonuses should likely be additive, not multiplicative with each other
        stats.criticalMultiplier = (stats.criticalMultiplier || 1.5) + item.criticalMultiplierModifier;
    }
    // Precision and Deflection
    if (item.precision !== undefined) {
        stats.precision = (stats.precision || 0) + item.precision;
    }
    if (item.deflection !== undefined) {
        stats.deflection = (stats.deflection || 0) + item.deflection;
    }
    if (item.healthRegen) {
        stats.healthRegen = (stats.healthRegen || 0) + item.healthRegen;
    }
    
    // New stats - Efficiency (check both direct properties and statModifiers)
    const armorEff = item.armorEfficiency !== undefined ? item.armorEfficiency : (item.statModifiers?.armorEfficiency || 0);
    if (armorEff > 0) stats.armorEfficiency = (stats.armorEfficiency || 0) + armorEff;
    
    const weaponEff = item.weaponEfficiency !== undefined ? item.weaponEfficiency : (item.statModifiers?.weaponEfficiency || 0);
    if (weaponEff > 0) stats.weaponEfficiency = (stats.weaponEfficiency || 0) + weaponEff;
    
    const bionicEff = item.bionicEfficiency !== undefined ? item.bionicEfficiency : (item.statModifiers?.bionicEfficiency || 0);
    if (bionicEff > 0) stats.bionicEfficiency = (stats.bionicEfficiency || 0) + bionicEff;
    
    // Bionic Sync
    const bionicSync = item.bionicSync !== undefined ? item.bionicSync : (item.statModifiers?.bionicSync || 0);
    if (bionicSync > 0) stats.bionicSync = (stats.bionicSync || 0) + bionicSync;
    
    // Combo Attack stats
    const comboAttack = item.comboAttack !== undefined ? item.comboAttack : (item.statModifiers?.comboAttack || 0);
    if (comboAttack > 0) stats.comboAttack = (stats.comboAttack || 0) + comboAttack;
    
    const comboEffectiveness = item.comboEffectiveness !== undefined ? item.comboEffectiveness : (item.statModifiers?.comboEffectiveness || 0);
    if (comboEffectiveness > 0) stats.comboEffectiveness = (stats.comboEffectiveness || 0) + comboEffectiveness;
    
    const additionalCombo = item.additionalComboAttacks !== undefined ? item.additionalComboAttacks : (item.statModifiers?.additionalComboAttacks || 0);
    if (additionalCombo > 0) stats.additionalComboAttacks = (stats.additionalComboAttacks || 0) + additionalCombo;
    
    // Mastery stats
    const kineticMastery = item.kineticMastery !== undefined ? item.kineticMastery : (item.statModifiers?.kineticMastery || 0);
    if (kineticMastery > 0) stats.kineticMastery = (stats.kineticMastery || 0) + kineticMastery;
    
    const slashingMastery = item.slashingMastery !== undefined ? item.slashingMastery : (item.statModifiers?.slashingMastery || 0);
    if (slashingMastery > 0) stats.slashingMastery = (stats.slashingMastery || 0) + slashingMastery;
    
    // Severed limb stats
    const severedLimbChance = item.severedLimbChance !== undefined ? item.severedLimbChance : (item.statModifiers?.severedLimbChance || 0);
    if (severedLimbChance > 0) stats.severedLimbChance = (stats.severedLimbChance || 0) + severedLimbChance;
    
    const maxSeveredLimbs = item.maxSeveredLimbs !== undefined ? item.maxSeveredLimbs : (item.statModifiers?.maxSeveredLimbs || 0);
    if (maxSeveredLimbs > 0) stats.maxSeveredLimbs = (stats.maxSeveredLimbs || 1) + maxSeveredLimbs;

    // Apply other stat modifiers
    if (item.statModifiers) {
        for (let stat in item.statModifiers) {
            // Skip stats that are already handled or could conflict
            const handledStats = [
                'damageTypes', 'defenseTypes', 'damageTypeModifiers', 'damageGroupModifiers',
                'attackSpeedModifier', 'criticalChanceModifier', 'criticalMultiplierModifier',
                'healthBonus', 'energyShieldBonus', 'healthBonusPercent', 'energyShieldBonusPercent',
                'precision', 'deflection', 'healthRegen',
                'armorEfficiency', 'weaponEfficiency', 'bionicEfficiency', 'bionicSync',
                'comboAttack', 'comboEffectiveness', 'additionalComboAttacks',
                'kineticMastery', 'slashingMastery', 'severedLimbChance', 'maxSeveredLimbs'
            ];
            if (handledStats.includes(stat)) {
                continue;
            } else if (stats.hasOwnProperty(stat)) {
                 stats[stat] += item.statModifiers[stat];
            } else {
                 stats[stat] = item.statModifiers[stat];
            }
        }
    }
}

// Calculate player's total stats based on base, passives, gear, and buffs
function calculatePlayerStats(playerObject) {
    // Start with a fresh copy of base stats
    let stats = JSON.parse(JSON.stringify(playerBaseStats));

    // Initialize bonus fields
    stats.healthBonus = 0;
    stats.healthBonusPercent = 0;
    stats.energyShieldBonus = 0;
    stats.energyShieldBonusPercent = 0;
    stats.damageTypeModifiers = {}; // Stores percentage increases (e.g., 1.15 for +15%)
    stats.damageGroupModifiers = {}; // Stores group percentage increases

    // Initialize modifiers to base value of 1.0 (100%)
    const damageGroups = ['physical', 'elemental', 'chemical'];
    for (const group of damageGroups) {
        stats.damageGroupModifiers[group] = 1.0;
    }
    // Assuming base damage types are defined in playerBaseStats.damageTypes
    for (let damageType in playerBaseStats.damageTypes) {
        stats.damageTypeModifiers[damageType] = 1.0;
    }
    // Ensure defense types are initialized
    if (!stats.defenseTypes) stats.defenseTypes = {};
    const defenseTypes = ['physicalResistance', 'elementalResistance', 'chemicalResistance'];
    for (const type of defenseTypes) {
        if (stats.defenseTypes[type] === undefined) stats.defenseTypes[type] = 0;
    }
    
    // Ensure new stats are initialized as numbers
    if (stats.armorEfficiency === undefined) stats.armorEfficiency = 0;
    if (stats.weaponEfficiency === undefined) stats.weaponEfficiency = 0;
    if (stats.bionicEfficiency === undefined) stats.bionicEfficiency = 0;
    if (stats.bionicSync === undefined) stats.bionicSync = 0;
    if (stats.comboAttack === undefined) stats.comboAttack = 0;
    if (stats.comboEffectiveness === undefined) stats.comboEffectiveness = 0;
    if (stats.additionalComboAttacks === undefined) stats.additionalComboAttacks = 0;
    if (stats.kineticMastery === undefined) stats.kineticMastery = 0;
    if (stats.slashingMastery === undefined) stats.slashingMastery = 0;
    if (stats.severedLimbChance === undefined) stats.severedLimbChance = 0;
    if (stats.maxSeveredLimbs === undefined) stats.maxSeveredLimbs = 1;


    // --- Apply Passives ---
    if (playerObject.passiveBonuses) {
        const passives = playerObject.passiveBonuses;
        // Flat bonuses
        stats.healthBonus += passives.flatHealth || 0;
        stats.energyShieldBonus += passives.flatEnergyShield || 0;
        stats.healthRegen += passives.healthRegen || 0;
        stats.precision += passives.precision || 0;
        stats.deflection += passives.deflection || 0;
        // Percentage bonuses
        stats.healthBonusPercent += (passives.healthPercent || 0) / 100;
        stats.energyShieldBonusPercent += (passives.energyShieldPercent || 0) / 100;
        // Crit
        stats.criticalChance += (passives.criticalChance || 0) / 100;
        stats.criticalMultiplier += passives.criticalMultiplier || 0;
        // Flat damage
        for (const damageType in passives.flatDamageTypes) {
            if (!stats.damageTypes[damageType]) stats.damageTypes[damageType] = 0;
            stats.damageTypes[damageType] += passives.flatDamageTypes[damageType];
        }
        // Defense
        for (const defenseType in passives.defenseTypes) {
            if (!stats.defenseTypes[defenseType]) stats.defenseTypes[defenseType] = 0;
            stats.defenseTypes[defenseType] += passives.defenseTypes[defenseType];
        }
        // Percentage damage (Type specific) - ADDITIVE
        for (const damageType in passives.damageTypes) {
            if (!stats.damageTypeModifiers[damageType]) stats.damageTypeModifiers[damageType] = 1.0;
            stats.damageTypeModifiers[damageType] += passives.damageTypes[damageType] / 100;
        }
        // Percentage damage (Group specific) - ADDITIVE
        for (const groupType in passives.damageGroups) {
            if (!stats.damageGroupModifiers[groupType]) stats.damageGroupModifiers[groupType] = 1.0;
            stats.damageGroupModifiers[groupType] += passives.damageGroups[groupType] / 100;
        }
    }

    // --- Mining permanent bonuses (derived from gathering skill level) ---
    if (typeof getMiningPermanentBonuses === 'function') {
        const miningLevel = playerObject.gatheringSkills?.Mining?.level || 0;
        if (miningLevel > 0) {
            const miningBonus = getMiningPermanentBonuses(miningLevel);
            stats.healthBonus += miningBonus.flatHealth;
            stats.healthBonusPercent += miningBonus.healthPercentFraction;
        }
    }

    // --- Apply Equipment ---
    let equipmentASBonus = 0; // Accumulator for attack speed % bonus from gear/bionics
    let mainHandLocalProfile = null;
    
    // First apply non-bionic equipment to get base Bionic Sync value
    Object.keys(playerObject.equipment).forEach(slot => {
        if (slot !== 'bionicSlots' && playerObject.equipment[slot]) {
            const item = playerObject.equipment[slot];
            const isMainHand = slot === 'mainHand';
            if (item.attackSpeedModifier !== undefined) {
                equipmentASBonus += item.attackSpeedModifier;
            }
            // Weapon base damage is local-only; do not merge main-hand damage directly into global pool.
            if (isMainHand && ((item.type || '').toLowerCase() === 'weapon' || item.slot === 'mainHand')) {
                mainHandLocalProfile = computeWeaponLocalProfile(item);
                applyItemModifiers(stats, item, { includeDamageTypes: false, includeDamageModifiers: true });
            } else {
                applyItemModifiers(stats, item);
            }
            // Apply slotted chip stats (if any)
            if (Array.isArray(item.rolledWires)) {
                item.rolledWires.forEach(wire => {
                    if (wire && wire.chip) {
                        applyItemModifiers(stats, wire.chip);
                    }
                });
            }
        }
    });
    
    // Now apply bionics with Bionic Sync enhancement
    const bionicSyncMultiplier = 1 + (stats.bionicSync / 100); // Convert percentage to multiplier
    playerObject.equipment.bionicSlots.forEach(bionic => {
        if (bionic) {
            // Apply attack speed with bionic sync
            if (bionic.attackSpeedModifier !== undefined) {
                equipmentASBonus += bionic.attackSpeedModifier * bionicSyncMultiplier;
            }
            
            // Create enhanced bionic stats for other modifiers
            const enhancedBionic = { ...bionic };
            
            // Apply bionic sync to all numeric stat modifiers
            if (enhancedBionic.healthBonus !== undefined) {
                enhancedBionic.healthBonus *= bionicSyncMultiplier;
            }
            if (enhancedBionic.energyShieldBonus !== undefined) {
                enhancedBionic.energyShieldBonus *= bionicSyncMultiplier;
            }
            if (enhancedBionic.healthBonusPercent !== undefined) {
                enhancedBionic.healthBonusPercent *= bionicSyncMultiplier;
            }
            if (enhancedBionic.energyShieldBonusPercent !== undefined) {
                enhancedBionic.energyShieldBonusPercent *= bionicSyncMultiplier;
            }
            if (enhancedBionic.criticalChanceModifier !== undefined) {
                enhancedBionic.criticalChanceModifier *= bionicSyncMultiplier;
            }
            if (enhancedBionic.criticalMultiplierModifier !== undefined) {
                enhancedBionic.criticalMultiplierModifier *= bionicSyncMultiplier;
            }
            if (enhancedBionic.precision !== undefined) {
                enhancedBionic.precision *= bionicSyncMultiplier;
            }
            if (enhancedBionic.deflection !== undefined) {
                enhancedBionic.deflection *= bionicSyncMultiplier;
            }
            if (enhancedBionic.healthRegen !== undefined) {
                enhancedBionic.healthRegen *= bionicSyncMultiplier;
            }
            
            // Apply bionic sync to damage types
            if (enhancedBionic.damageTypes) {
                for (let damageType in enhancedBionic.damageTypes) {
                    enhancedBionic.damageTypes[damageType] *= bionicSyncMultiplier;
                }
            }
            
            // Apply bionic sync to defense types
            if (enhancedBionic.defenseTypes) {
                for (let defenseType in enhancedBionic.defenseTypes) {
                    enhancedBionic.defenseTypes[defenseType] *= bionicSyncMultiplier;
                }
            }
            
            // Apply bionic sync to new stats
            if (enhancedBionic.armorEfficiency !== undefined) {
                enhancedBionic.armorEfficiency *= bionicSyncMultiplier;
            }
            if (enhancedBionic.weaponEfficiency !== undefined) {
                enhancedBionic.weaponEfficiency *= bionicSyncMultiplier;
            }
            if (enhancedBionic.bionicEfficiency !== undefined) {
                enhancedBionic.bionicEfficiency *= bionicSyncMultiplier;
            }
            if (enhancedBionic.comboAttack !== undefined) {
                enhancedBionic.comboAttack *= bionicSyncMultiplier;
            }
            if (enhancedBionic.comboEffectiveness !== undefined) {
                enhancedBionic.comboEffectiveness *= bionicSyncMultiplier;
            }
            if (enhancedBionic.additionalComboAttacks !== undefined) {
                enhancedBionic.additionalComboAttacks *= bionicSyncMultiplier;
            }
            
            applyItemModifiers(stats, enhancedBionic); // Apply enhanced bionic stats
            // If bionics ever support wires, also apply slotted chip stats
            if (Array.isArray(bionic.rolledWires)) {
                bionic.rolledWires.forEach(wire => {
                    if (wire && wire.chip) {
                        applyItemModifiers(stats, wire.chip);
                    }
                });
            }
        }
    });

    // --- Apply Buffs ---
    let buffASBonus = 0; // Accumulator for attack speed % bonus from buffs
    if (playerObject.activeBuffs) {
        playerObject.activeBuffs.forEach(buff => {
            if (buff.statChanges) {
                for (let stat in buff.statChanges) {
                    if (stat === 'attackSpeed') { // Handle attack speed buff specifically
                        buffASBonus += buff.statChanges[stat];
                    } else if (stat === 'defenseTypes' && buff.statChanges.defenseTypes && stats.defenseTypes) {
                        for (const defenseType in buff.statChanges.defenseTypes) {
                            if (stats.defenseTypes[defenseType] === undefined) stats.defenseTypes[defenseType] = 0;
                            stats.defenseTypes[defenseType] += buff.statChanges.defenseTypes[defenseType];
                        }
                    } else if (
                        (stat === 'physicalResistance' || stat === 'elementalResistance' || stat === 'chemicalResistance') &&
                        stats.defenseTypes
                    ) {
                        if (stats.defenseTypes[stat] === undefined) stats.defenseTypes[stat] = 0;
                        stats.defenseTypes[stat] += buff.statChanges[stat];
                    } else if (stats.hasOwnProperty(stat)) { // Apply other flat stat changes
                        stats[stat] += buff.statChanges[stat];
                    }
                    // Note: Buffs affecting % modifiers (like damage%) would need specific handling here if required
                }
            }
        });
    }

    // --- Final Calculations ---

    // Determine base attack speed from weapon or default
    let baseAttackSpeed = 1.0;
    if (playerObject.equipment.mainHand && playerObject.equipment.mainHand.bAttackSpeed !== undefined) {
        baseAttackSpeed = playerObject.equipment.mainHand.bAttackSpeed;
    }
    const localWeaponASMultiplier = mainHandLocalProfile ? mainHandLocalProfile.localAttackSpeedMultiplier : 1;
    const localAttackSpeed = baseAttackSpeed * localWeaponASMultiplier;

    // Calculate final attack speed: (Weapon Base * local weapon AS) * (1 + global AS bonuses)
    let totalASBonusPercent = equipmentASBonus + buffASBonus + (playerObject.passiveAttackSpeedBonus || 0);
    stats.attackSpeed = localAttackSpeed * (1 + totalASBonusPercent);
    stats.attackSpeed = Math.min(Math.max(stats.attackSpeed, 0.1), 10); // Clamp attack speed

    if (mainHandLocalProfile) {
        stats.weaponBaseAttackSpeed = Number(baseAttackSpeed.toFixed(3));
        stats.weaponLocalAttackSpeed = Number(localAttackSpeed.toFixed(3));
        stats.weaponLocalAttackSpeedPercent = mainHandLocalProfile.localAttackSpeedPercent;
        stats.weaponLocalDamage = JSON.parse(JSON.stringify(mainHandLocalProfile.finalDamage));
        stats.weaponBaseDamage = JSON.parse(JSON.stringify(mainHandLocalProfile.baseDamage));
        stats.weaponDamageConversion = mainHandLocalProfile.conversion ? { ...mainHandLocalProfile.conversion } : null;

        // Export final weapon-local damage into global flat pool exactly once.
        Object.keys(mainHandLocalProfile.finalFlatDamage).forEach((type) => {
            if (!DAMAGE_TYPE_TO_GROUP[type]) return;
            if (!stats.damageTypes[type]) stats.damageTypes[type] = 0;
            stats.damageTypes[type] += Number(mainHandLocalProfile.finalFlatDamage[type] || 0);
        });
    } else {
        stats.weaponBaseAttackSpeed = Number(baseAttackSpeed.toFixed(3));
        stats.weaponLocalAttackSpeed = Number(baseAttackSpeed.toFixed(3));
        stats.weaponLocalAttackSpeedPercent = 0;
        stats.weaponLocalDamage = {};
        stats.weaponBaseDamage = {};
        stats.weaponDamageConversion = null;
    }

    // Calculate final health and energy shield
    stats.health = stats.maxHealth + stats.healthBonus;
    stats.health *= (1 + stats.healthBonusPercent);
    stats.health = Math.max(Math.round(stats.health), 1);

    stats.energyShield = stats.maxEnergyShield + stats.energyShieldBonus;
    stats.energyShield *= (1 + stats.energyShieldBonusPercent);
    stats.energyShield = Math.max(Math.round(stats.energyShield), 0);

    // *** FIX: Do NOT apply percentage modifiers to flat damage here ***
    // The flat damage in stats.damageTypes is now the final base flat damage.
    // Percentage modifiers (stats.damageTypeModifiers, stats.damageGroupModifiers)
    // will be applied only in the calculateDamage function during combat.

    // Round flat damage types for display consistency
    for (let dt in stats.damageTypes) {
        stats.damageTypes[dt] = Math.round(stats.damageTypes[dt]);
    }

    // Assign the newly calculated stats back to the player object
    playerObject.totalStats = stats;

    // Initialize/Clamp current health/shield
    if (playerObject.currentHealth === null || isNaN(playerObject.currentHealth) || playerObject.currentHealth === undefined) {
        playerObject.currentHealth = stats.health;
    }
    if (playerObject.currentShield === null || isNaN(playerObject.currentShield) || playerObject.currentShield === undefined) {
        playerObject.currentShield = stats.energyShield;
    }
    playerObject.currentHealth = Math.min(playerObject.currentHealth, stats.health);
    playerObject.currentShield = Math.min(playerObject.currentShield, stats.energyShield);

    return stats; // Return the calculated stats object
}


// --- Moved from combat.js ---

// Calculate damage dealt by attacker to defender
function calculateDamage(attacker, defender, attackContext = null) {
    const ctx = attackContext || {};
    if (
        attacker === player &&
        attacker?.equipment?.mainHand?.weaponBaseDamage &&
        attacker?.equipment?.mainHand?.damageTypes
    ) {
        console.warn('Main-hand weapon still has legacy damageTypes alongside weaponBaseDamage; ensure duplicate base damage is not reintroduced.');
    }
    // Object to store base damage values per type (before modifiers)
    let baseDamages = {};
    if (attacker.totalStats && attacker.totalStats.damageTypes) {
        baseDamages = { ...attacker.totalStats.damageTypes }; // Use the base flat damage
    }

    // Object to store the final calculated damage per type after all mods/crits/resists
    let finalDamageBreakdown = {};
    let totalDamageDealt = 0;

    // Define damage type groups
    const damageTypeToGroup = {
        'kinetic': 'physical', 'slashing': 'physical',
        'pyro': 'elemental', 'cryo': 'elemental', 'electric': 'elemental',
        'corrosive': 'chemical', 'radiation': 'chemical'
    };

    // 1. Calculate Total Potential Damage (Sum of base damages after % increases)
    let totalPotentialDamage = 0;
    let adjustedBaseDamages = {}; // Store base damage *after* % mods for later proportion calculation

    for (let damageType in baseDamages) {
        let currentDamage = baseDamages[damageType];

        // Apply specific damage type % modifiers (e.g., +15% Pyro Damage -> multiplier 1.15)
        if (attacker.totalStats.damageTypeModifiers && attacker.totalStats.damageTypeModifiers[damageType]) {
            currentDamage *= attacker.totalStats.damageTypeModifiers[damageType];
        }

        // Apply damage group % modifiers (e.g., +10% Elemental Damage -> multiplier 1.10)
        const group = damageTypeToGroup[damageType];
        if (group && attacker.totalStats.damageGroupModifiers && attacker.totalStats.damageGroupModifiers[group]) {
            currentDamage *= attacker.totalStats.damageGroupModifiers[group];
        }

        // Apply mastery bonuses for specific damage types
        if (damageType === 'kinetic' && attacker.totalStats.kineticMastery) {
            const masteryBonus = 1 + (attacker.totalStats.kineticMastery * 0.1); // Each point = +10% damage
            currentDamage *= masteryBonus;
        }
        if (damageType === 'slashing' && attacker.totalStats.slashingMastery) {
            const masteryBonus = 1 + (attacker.totalStats.slashingMastery * 0.1); // Each point = +10% damage
            currentDamage *= masteryBonus;
        }

        // Apply weapon type % modifiers (if applicable, e.g. player with specific weapon)
        // Example: if (attacker === player && player.equipment.mainHand && attacker.totalStats.weaponTypeModifiers...) { ... }

        // Apply global damage multipliers (e.g., from debuffs like Rusted)
        if (attacker.totalStats.damageMultipliers) {
            for (const multiplierName in attacker.totalStats.damageMultipliers) {
                currentDamage *= attacker.totalStats.damageMultipliers[multiplierName];
            }
        }

        adjustedBaseDamages[damageType] = Math.max(0, currentDamage); // Store adjusted base damage
        totalPotentialDamage += adjustedBaseDamages[damageType];
    }

    // Handle case where total potential damage is zero
    if (totalPotentialDamage <= 0) {
        return { total: 0, damageBreakdown: {}, isCritical: false };
    }

    // 2. Damage Roll (Randomization based on Precision/Deflection)
    let attackerPrecision = attacker.totalStats.precision || 0;
    let defenderDeflection = defender.totalStats.deflection || 0;
    let skew = Math.max(0.1, 1 + (defenderDeflection - attackerPrecision) * 0.05);
    let damagePercentage = skewedRandom(0.1, 1.0, skew); // Roll between 10% and 100%
    let rolledDamage = totalPotentialDamage * damagePercentage;

    // Strict cap: ensure rolled damage doesn't exceed total potential damage
    rolledDamage = Math.min(rolledDamage, totalPotentialDamage);

    // 3. Critical Hit Check & Application
    let critChance = attacker.totalStats.criticalChance || 0;
    if (ctx.critChanceBonus) {
        critChance += ctx.critChanceBonus;
    }
    if (ctx.critChanceMultiplier && ctx.critChanceMultiplier !== 1) {
        critChance *= ctx.critChanceMultiplier;
    }
    critChance = Math.min(Math.max(critChance, 0), 1);

    let isCriticalHit = false;
    if (ctx.skipCrit) {
        isCriticalHit = false;
    } else if (ctx.forceCrit) {
        isCriticalHit = true;
    } else {
        isCriticalHit = Math.random() < critChance;
    }
    let critMultiplier = 1.0;

    // Check for effects that guarantee or modify crits (e.g., Zapped debuff)
    if (!ctx.skipCrit && defender.activeDebuffs && defender.activeDebuffs.some(effect => effect.name === "Zapped")) {
        isCriticalHit = true;
        // Find and potentially remove the Zapped debuff (assuming removeDebuff exists globally or is passed in)
        if (typeof removeDebuff === 'function') removeDebuff(defender, "Zapped");
        if (typeof logMessage === 'function') logMessage(`${defender.name || 'Target'} was Zapped! Guaranteed critical hit!`);
    }

    if (isCriticalHit) {
        critMultiplier = attacker.totalStats.criticalMultiplier || 1.5;
        rolledDamage *= critMultiplier;
        if (typeof logMessage === 'function') logMessage(`${attacker.name || 'Attacker'} lands a critical hit!`);
    }

    // 4. Apply Defender's Resistances (per damage type)
    for (let damageType in adjustedBaseDamages) {
        let adjustedBaseDamage = adjustedBaseDamages[damageType];

        // Calculate the proportion this damage type contributes to the total potential damage
        let damageProportion = totalPotentialDamage > 0 ? adjustedBaseDamage / totalPotentialDamage : 0;

        // Determine the amount of rolled damage attributed to this type
        let damageAmountForType = rolledDamage * damageProportion;

        // Apply defender's resistance for this damage type
        let resistanceStat = matchDamageToDefense(damageType); // Assumes matchDamageToDefense exists
        let resistanceValue = (defender.totalStats && defender.totalStats.defenseTypes) ? (defender.totalStats.defenseTypes[resistanceStat] || 0) : 0;

        // Apply resistance formula (e.g., percentage reduction, capped at 80%)
        resistanceValue = Math.min(resistanceValue, 80); // Cap resistance
        let damageReductionMultiplier = Math.max(0, 1 - (resistanceValue / 100)); // Ensure multiplier is not negative

        let finalDamageForType = damageAmountForType * damageReductionMultiplier;

        // Store in final breakdown and add to total
        finalDamageBreakdown[damageType] = Math.round(finalDamageForType * 10) / 10; // Round for display
        totalDamageDealt += finalDamageForType;
    }

    // Round total damage to nearest whole number
    totalDamageDealt = Math.round(totalDamageDealt);

    // Debugging Logs (optional)
    console.log(`Damage Calc: Attacker=${attacker.name}, Defender=${defender.name}`);
    console.log(` - Base Damages:`, baseDamages);
    console.log(` - Adjusted Base Damages (after % mods):`, adjustedBaseDamages);
    console.log(` - Total Potential Damage: ${totalPotentialDamage.toFixed(2)}`);
    console.log(` - Damage Roll %: ${damagePercentage.toFixed(3)}, Skew: ${skew.toFixed(2)}`);
    console.log(` - Rolled Damage (before crit): ${rolledDamage.toFixed(2)}`);
    console.log(` - Critical Hit: ${isCriticalHit}, Multiplier: ${critMultiplier.toFixed(2)}`);
    console.log(` - Rolled Damage (after crit): ${rolledDamage.toFixed(2)}`);
    console.log(` - Defender Resistances Applied`);
    console.log(` - Final Damage Breakdown:`, finalDamageBreakdown);
    console.log(` - Total Damage Dealt: ${totalDamageDealt}`);

    return {
        total: totalDamageDealt,
        damageBreakdown: finalDamageBreakdown,
        isCritical: isCriticalHit
    };
}

// Calculate enemy's total stats (simpler version, assumes enemy object has base stats)
function calculateEnemyStats(enemyObject) {
    if (!enemyObject) return;

    // Create totalStats if it doesn't exist or reset it
    enemyObject.totalStats = {};

    // Initialize with base stats from the enemy definition
    enemyObject.totalStats.health = enemyObject.health || 100;
    enemyObject.totalStats.energyShield = enemyObject.energyShield || 0;
    enemyObject.totalStats.attackSpeed = enemyObject.attackSpeed || 1;
    enemyObject.totalStats.criticalChance = enemyObject.criticalChance || 0.05;
    enemyObject.totalStats.criticalMultiplier = enemyObject.criticalMultiplier || 1.5;
    enemyObject.totalStats.precision = enemyObject.precision || 0;
    enemyObject.totalStats.deflection = enemyObject.deflection || 0;

    // Damage types (store base flat damage)
    enemyObject.totalStats.damageTypes = {};
    if (enemyObject.damageTypes) {
        enemyObject.totalStats.damageTypes = { ...enemyObject.damageTypes };
    }

    // Defense types
    enemyObject.totalStats.defenseTypes = {};
    if (enemyObject.defenseTypes) {
         enemyObject.totalStats.defenseTypes = { ...enemyObject.defenseTypes };
    } else {
        // Ensure default defense types exist if none are defined
        enemyObject.totalStats.defenseTypes = { physicalResistance: 0, elementalResistance: 0, chemicalResistance: 0 };
    }

    // Initialize modifier stores
    enemyObject.totalStats.damageTypeModifiers = {};
    enemyObject.totalStats.damageGroupModifiers = { physical: 1.0, elemental: 1.0, chemical: 1.0 };
    enemyObject.totalStats.damageMultipliers = {}; // For global multipliers like Rusted

    // --- Apply Buffs/Debuffs affecting stats ---
    // (This part needs careful implementation based on how buffs/debuffs modify enemy stats)

    // Example: Apply buffs affecting flat stats
    if (enemyObject.activeBuffs) {
        enemyObject.activeBuffs.forEach(buff => {
            if (buff.statChanges) {
                for (const stat in buff.statChanges) {
                    if (enemyObject.totalStats.hasOwnProperty(stat) && typeof enemyObject.totalStats[stat] === 'number') {
                        enemyObject.totalStats[stat] += buff.statChanges[stat];
                    }
                    // Handle buffs affecting % modifiers if needed
                }
            }
        });
    }

    // Example: Apply debuffs affecting stats (like Rusted reducing damage multiplier)
    if (enemyObject.activeDebuffs) {
         enemyObject.activeDebuffs.forEach(debuff => {
             // Example: Rusted debuff applies a damage multiplier
             if (debuff.name === "Rusted" && debuff.onApply) {
                 // Rusted logic might directly modify totalStats or add to damageMultipliers
                 // Let's assume it adds to damageMultipliers for consistency
                 if (!enemyObject.totalStats.damageMultipliers) enemyObject.totalStats.damageMultipliers = {};
                 enemyObject.totalStats.damageMultipliers.rusted = 0.75; // Example value
             }
             // Handle other debuffs affecting stats (e.g., resistance reduction)
             // Note: Resistance reduction is often handled directly in the debuff's onApply/onRemove
         });
    }

    // Ensure health/shield are positive
    enemyObject.totalStats.health = Math.max(1, Math.round(enemyObject.totalStats.health));
    enemyObject.totalStats.energyShield = Math.max(0, Math.round(enemyObject.totalStats.energyShield));

    // Clamp attack speed
    enemyObject.totalStats.attackSpeed = Math.min(Math.max(enemyObject.totalStats.attackSpeed, 0.1), 10);

    // Update current health/shield if necessary (e.g., if max changed)
    if (enemyObject.currentHealth > enemyObject.totalStats.health) {
        enemyObject.currentHealth = enemyObject.totalStats.health;
    }
    if (enemyObject.currentShield > enemyObject.totalStats.energyShield) {
        enemyObject.currentShield = enemyObject.totalStats.energyShield;
    }
}

// --- Utility Functions ---

// Skewed random number generation (used in calculateDamage)
function skewedRandom(min, max, skew) {
    let range = max - min;
    let num = Math.random();
    num = Math.pow(num, skew); // Apply skew
    num = num * range + min; // Scale to range
    return Math.max(min, Math.min(num, max)); // Clamp within [min, max]
}

// Match damage type to defense type (used in calculateDamage)
function matchDamageToDefense(damageType) {
    const mapping = {
        'kinetic': 'physicalResistance', 'slashing': 'physicalResistance', // Physical
        'pyro': 'elementalResistance', 'cryo': 'elementalResistance', 'electric': 'elementalResistance', // Elemental
        'corrosive': 'chemicalResistance', 'radiation': 'chemicalResistance' // Chemical
    };
    // Legacy support
    if (damageType === 'mental') return 'physicalResistance';
    if (damageType === 'chemical') return 'chemicalResistance';
    if (damageType === 'magnetic') return 'elementalResistance';

    return mapping[damageType] || ''; // Return specific defense or empty string
}

// Helper to capitalize first letter (used in logging/display)
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper to get damage type color (used in logging/display)
function getDamageTypeColor(damageType) {
    const colors = {
        kinetic: "#A9A9A9", pyro: "#FF4500", corrosive: "#32CD32",
        slashing: "#C0C0C0", cryo: "#87CEEB", radiation: "#9370DB",
        electric: "#FFD700"
    };
    return colors[damageType] || "#FFFFFF"; // Default white
}
