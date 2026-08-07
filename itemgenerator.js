const RANDOM_MODIFIER_GRADE_WEIGHTS = [
    { minLevel: 1, maxLevel: 10, weights: [{ grade: 1, weight: 100 }] },
    { minLevel: 11, maxLevel: 20, weights: [{ grade: 1, weight: 35 }, { grade: 2, weight: 65 }] },
    { minLevel: 21, maxLevel: 30, weights: [{ grade: 1, weight: 10 }, { grade: 2, weight: 45 }, { grade: 3, weight: 45 }] },
    { minLevel: 31, maxLevel: 40, weights: [{ grade: 2, weight: 15 }, { grade: 3, weight: 45 }, { grade: 4, weight: 40 }] },
    { minLevel: 41, maxLevel: 50, weights: [{ grade: 3, weight: 15 }, { grade: 4, weight: 45 }, { grade: 5, weight: 40 }] }
];

const RANDOM_MODIFIER_COUNT_WEIGHTS = [
    { minLevel: 1, maxLevel: 10, weights: [{ count: 1, weight: 90 }, { count: 2, weight: 10 }] },
    { minLevel: 11, maxLevel: 20, weights: [{ count: 1, weight: 70 }, { count: 2, weight: 30 }] },
    { minLevel: 21, maxLevel: 30, weights: [{ count: 2, weight: 100 }] },
    { minLevel: 31, maxLevel: 40, weights: [{ count: 2, weight: 80 }, { count: 3, weight: 20 }] },
    { minLevel: 41, maxLevel: 50, weights: [{ count: 2, weight: 60 }, { count: 3, weight: 40 }] }
];

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

const MODIFIER_GRADE_LABELS = {
    1: 'Grade I',
    2: 'Grade II',
    3: 'Grade III',
    4: 'Grade IV',
    5: 'Grade V'
};

function getModifierGradeLabel(grade) {
    return MODIFIER_GRADE_LABELS[grade] || `Grade ${grade}`;
}

function getRandomWeightEntry(weightedEntries) {
    const totalWeight = weightedEntries.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) return weightedEntries[0];
    let roll = Math.random() * totalWeight;
    for (const entry of weightedEntries) {
        roll -= entry.weight;
        if (roll <= 0) return entry;
    }
    return weightedEntries[weightedEntries.length - 1];
}

function getWeightedBucket(level, buckets) {
    return buckets.find(bucket => level >= bucket.minLevel && level <= bucket.maxLevel)
        || buckets[buckets.length - 1];
}

function normalizeGeneratedItemLevel(levelRequirement) {
    if (typeof levelRequirement === 'number' && Number.isFinite(levelRequirement)) {
        return Math.max(1, Math.floor(levelRequirement));
    }
    if (levelRequirement && typeof levelRequirement === 'object') {
        if (typeof levelRequirement.min === 'number' && Number.isFinite(levelRequirement.min)) {
            return Math.max(1, Math.floor(levelRequirement.min));
        }
        if (typeof levelRequirement.max === 'number' && Number.isFinite(levelRequirement.max)) {
            return Math.max(1, Math.floor(levelRequirement.max));
        }
    }
    return 1;
}

function getModifierCountForLevel(level) {
    const bucket = getWeightedBucket(level, RANDOM_MODIFIER_COUNT_WEIGHTS);
    const picked = getRandomWeightEntry(bucket.weights);
    return picked.count;
}

function getModifierGradeForLevel(level) {
    const bucket = getWeightedBucket(level, RANDOM_MODIFIER_GRADE_WEIGHTS);
    const picked = getRandomWeightEntry(bucket.weights);
    return picked.grade;
}

function getMaxModifierGradeForLevel(level) {
    if (level >= 41) return 5;
    if (level >= 31) return 4;
    if (level >= 21) return 3;
    if (level >= 11) return 2;
    return 1;
}

function getModifierCountRangeForLevel(level) {
    const bucket = getWeightedBucket(level, RANDOM_MODIFIER_COUNT_WEIGHTS);
    const counts = bucket.weights.map(entry => entry.count).sort((a, b) => a - b);
    const min = counts[0];
    const max = counts[counts.length - 1];
    return min === max ? `${min}` : `${min}-${max}`;
}

function getDamageTypesFromItem(item) {
    const result = new Set();
    if (!item || typeof item !== 'object') return result;
    const source = item.weaponBaseDamage || item.baseDamageTypes || item.damageTypes;
    if (!source || typeof source !== 'object') return result;
    Object.keys(source).forEach(rawType => {
        const type = rawType === 'mental' ? 'slashing' : rawType === 'magnetic' ? 'electric' : rawType === 'chemical' ? 'corrosive' : rawType;
        if (!Object.prototype.hasOwnProperty.call(DAMAGE_TYPE_TO_GROUP, type)) return;
        const value = source[rawType];
        const numeric = typeof value === 'number'
            ? value
            : (value && typeof value === 'object' && typeof value.min === 'number' ? value.min : 0);
        if (numeric > 0) {
            result.add(type);
        }
    });
    return result;
}

function getDamageGroupsFromDamageTypes(damageTypes) {
    const groups = new Set();
    damageTypes.forEach(type => {
        const group = DAMAGE_TYPE_TO_GROUP[type];
        if (group) groups.add(group);
    });
    return groups;
}

function createModifierDefinition(config) {
    return {
        id: config.id,
        displayName: config.displayName,
        statPath: config.statPath,
        applyType: config.applyType,
        grades: config.grades,
        isPercent: !!config.isPercent,
        eligibility: config.eligibility
    };
}

function createSharedModifierDefinitions() {
    const defs = [];
    const grade = (g1, g2, g3, g4, g5) => ({
        1: g1, 2: g2, 3: g3, 4: g4, 5: g5
    });

    defs.push(createModifierDefinition({
        id: 'flatMaxHealth',
        displayName: 'Max Health',
        statPath: 'healthBonus',
        applyType: 'flat',
        grades: grade([8, 25], [30, 80], [90, 220], [240, 520], [550, 1000]),
        eligibility: (ctx) => ctx.isArmor || ctx.isOffHand || ctx.isBionic
    }));

    defs.push(createModifierDefinition({
        id: 'percentMaxHealth',
        displayName: 'Max Health',
        statPath: 'healthBonusPercent',
        applyType: 'topLevelPercent',
        isPercent: true,
        grades: grade([2, 4], [4, 7], [7, 11], [11, 16], [16, 24]),
        eligibility: (ctx) => ctx.isArmor || ctx.isOffHand || ctx.isBionic
    }));

    defs.push(createModifierDefinition({
        id: 'flatEnergyShield',
        displayName: 'Energy Shield',
        statPath: 'energyShieldBonus',
        applyType: 'flat',
        grades: grade([6, 20], [25, 70], [80, 180], [200, 450], [475, 850]),
        eligibility: (ctx) => ctx.isArmor || ctx.isOffHand || ctx.isBionic
    }));

    defs.push(createModifierDefinition({
        id: 'percentEnergyShield',
        displayName: 'Energy Shield',
        statPath: 'energyShieldBonusPercent',
        applyType: 'topLevelPercent',
        isPercent: true,
        grades: grade([2, 4], [4, 7], [7, 11], [11, 16], [16, 24]),
        eligibility: (ctx) => ctx.isArmor || ctx.isOffHand || ctx.isBionic
    }));

    ['physicalResistance', 'elementalResistance', 'chemicalResistance'].forEach(resistanceKey => {
        const labelMap = {
            physicalResistance: 'Physical Resistance',
            elementalResistance: 'Elemental Resistance',
            chemicalResistance: 'Chemical Resistance'
        };
        defs.push(createModifierDefinition({
            id: `resistance_${resistanceKey}`,
            displayName: labelMap[resistanceKey],
            statPath: `defenseTypes.${resistanceKey}`,
            applyType: 'flat',
            isPercent: true,
            grades: grade([1, 3], [3, 6], [6, 10], [10, 15], [15, 22]),
            eligibility: (ctx) => ctx.isArmor || ctx.isOffHand || ctx.isBionic
        }));
    });

    Object.keys(DAMAGE_TYPE_TO_GROUP).forEach(type => {
        const typeDisplay = type.charAt(0).toUpperCase() + type.slice(1).replace('corrosive', 'Corrosive');
        defs.push(createModifierDefinition({
            id: `damageTypePercent_${type}`,
            displayName: `Weapon ${typeDisplay} Damage`,
            statPath: `statModifiers.damageTypes.${type}`,
            applyType: 'statModifierPercent',
            isPercent: true,
            grades: grade([4, 8], [8, 14], [14, 22], [22, 32], [32, 45]),
            eligibility: (ctx) => ctx.offensiveAllowed && (ctx.isWeapon ? ctx.allowedWeaponLocalDamageTypes.has(type) : ctx.damageTypes.has(type))
        }));
    });

    Object.keys(DAMAGE_GROUP_TO_TYPES).forEach(group => {
        const nameMap = {
            physical: 'Physical Damage',
            elemental: 'Elemental Damage',
            chemical: 'Chemical Damage'
        };
        defs.push(createModifierDefinition({
            id: `damageGroupPercent_${group}`,
            displayName: `Weapon ${nameMap[group]}`,
            statPath: `statModifiers.damageGroups.${group}`,
            applyType: 'statModifierPercent',
            isPercent: true,
            grades: grade([3, 6], [6, 11], [11, 17], [17, 25], [25, 36]),
            eligibility: (ctx) => ctx.offensiveAllowed && ctx.damageGroups.has(group)
        }));
    });

    Object.keys(DAMAGE_TYPE_TO_GROUP).forEach(type => {
        const typeDisplay = type.charAt(0).toUpperCase() + type.slice(1).replace('corrosive', 'Corrosive');
        defs.push(createModifierDefinition({
            id: `flatDamage_${type}`,
            displayName: `Weapon ${typeDisplay} Damage`,
            statPath: `damageTypes.${type}`,
            applyType: 'flat',
            grades: grade([2, 6], [7, 18], [20, 45], [50, 110], [120, 250]),
            eligibility: (ctx) => ctx.flatDamageAllowed && (ctx.isWeapon ? ctx.allowedWeaponLocalDamageTypes.has(type) : ctx.damageTypes.has(type))
        }));
    });

    Object.keys(DAMAGE_TYPE_TO_GROUP).forEach((source) => {
        Object.keys(DAMAGE_TYPE_TO_GROUP).forEach((target) => {
            if (source === target) return;
            defs.push(createModifierDefinition({
                id: `weaponConversion_${source}_to_${target}`,
                displayName: `${source.charAt(0).toUpperCase() + source.slice(1)} Weapon Damage Converted to ${target.charAt(0).toUpperCase() + target.slice(1)}`,
                statPath: 'weaponDamageConversion',
                applyType: 'conversion',
                conversionSource: source,
                conversionTarget: target,
                isPercent: false,
                grades: grade([100, 100], [100, 100], [100, 100], [100, 100], [100, 100]),
                eligibility: (ctx) => ctx.isWeapon && ctx.allowedWeaponLocalDamageTypes.has(source)
            }));
        });
    });

    defs.push(createModifierDefinition({
        id: 'precision',
        displayName: 'Precision',
        statPath: 'precision',
        applyType: 'flat',
        grades: grade([2, 8], [8, 18], [18, 38], [38, 75], [75, 130]),
        eligibility: (ctx) => ctx.isWeapon || ctx.slot === 'gloves' || ctx.slot === 'head' || ctx.slot === 'feet' || ctx.isOffHand || ctx.isBionic
    }));

    defs.push(createModifierDefinition({
        id: 'deflection',
        displayName: 'Deflection',
        statPath: 'deflection',
        applyType: 'flat',
        grades: grade([2, 8], [8, 18], [18, 38], [38, 75], [75, 130]),
        eligibility: (ctx) => ctx.isArmor || ctx.isOffHand || ctx.isBionic
    }));

    defs.push(createModifierDefinition({
        id: 'criticalChance',
        displayName: 'Critical Chance',
        statPath: 'criticalChanceModifier',
        applyType: 'topLevelPercent',
        isPercent: true,
        grades: grade([1, 2], [2, 4], [4, 6], [6, 9], [9, 13]),
        eligibility: (ctx) => ctx.isWeapon || ctx.slot === 'gloves' || ctx.slot === 'head' || ctx.offensiveAllowed
    }));

    defs.push(createModifierDefinition({
        id: 'criticalMultiplier',
        displayName: 'Critical Multiplier',
        statPath: 'criticalMultiplierModifier',
        applyType: 'topLevelPercent',
        isPercent: true,
        grades: grade([5, 10], [10, 18], [18, 30], [30, 45], [45, 65]),
        eligibility: (ctx) => ctx.isWeapon || ctx.slot === 'gloves' || ctx.slot === 'head' || ctx.offensiveAllowed
    }));

    defs.push(createModifierDefinition({
        id: 'attackSpeed',
        displayName: 'Weapon Attack Speed',
        statPath: 'attackSpeedModifier',
        applyType: 'topLevelPercent',
        isPercent: true,
        grades: grade([2, 4], [4, 7], [7, 10], [10, 14], [14, 18]),
        eligibility: (ctx) => ctx.isWeapon || ctx.slot === 'gloves' || ctx.slot === 'feet' || ctx.offensiveAllowed
    }));

    defs.push(createModifierDefinition({
        id: 'weaponEfficiency',
        displayName: 'Weapon Efficiency',
        statPath: 'weaponEfficiency',
        applyType: 'flat',
        grades: grade([3, 8], [8, 16], [16, 28], [28, 45], [45, 70]),
        eligibility: (ctx) => ctx.isWeapon || ctx.slot === 'gloves' || ctx.offensiveAllowed
    }));

    defs.push(createModifierDefinition({
        id: 'armorEfficiency',
        displayName: 'Armor Efficiency',
        statPath: 'armorEfficiency',
        applyType: 'flat',
        grades: grade([3, 8], [8, 16], [16, 28], [28, 45], [45, 70]),
        eligibility: (ctx) => ctx.isArmor || ctx.isOffHand || ctx.isBionic
    }));

    defs.push(createModifierDefinition({
        id: 'bionicEfficiency',
        displayName: 'Bionic Efficiency',
        statPath: 'bionicEfficiency',
        applyType: 'flat',
        grades: grade([3, 8], [8, 16], [16, 28], [28, 45], [45, 70]),
        eligibility: (ctx) => ctx.isBionic
    }));

    defs.push(createModifierDefinition({
        id: 'healthRegen',
        displayName: 'Health Regen',
        statPath: 'healthRegen',
        applyType: 'float',
        grades: grade([0.5, 1.5], [1.5, 3], [3, 6], [6, 10], [10, 16]),
        eligibility: (ctx) => ctx.isArmor || ctx.isOffHand || ctx.isBionic
    }));

    defs.push(createModifierDefinition({
        id: 'armorPenetration',
        displayName: 'Armor Penetration',
        statPath: 'armorPenetration',
        applyType: 'flat',
        isPercent: true,
        grades: grade([2, 4], [4, 7], [7, 11], [11, 16], [16, 24]),
        eligibility: (ctx) => ctx.isWeapon || (ctx.isOffHand && ctx.offensiveAllowed)
    }));

    return defs;
}

const RANDOM_MODIFIER_DEFINITIONS = createSharedModifierDefinitions();

function getModifierContext(item) {
    const type = (item.type || '').toString().toLowerCase();
    const slot = item.slot || null;
    const isWeapon = type === 'weapon' || slot === 'mainHand';
    const isOffHand = slot === 'offHand';
    const isBionic = type === 'bionic' || slot === 'bionic';
    const isArmor = type === 'armor' && !isOffHand;
    const isChip = type === 'chip';
    const isMaterial = type === 'material';
    const isComponent = type === 'component';
    const damageTypes = getDamageTypesFromItem(item);
    const damageGroups = getDamageGroupsFromDamageTypes(damageTypes);
    const allowedWeaponLocalDamageTypes = new Set();
    if (isWeapon) {
        damageGroups.forEach((group) => {
            (DAMAGE_GROUP_TO_TYPES[group] || []).forEach((type) => allowedWeaponLocalDamageTypes.add(type));
        });
    }
    const offensiveAllowed = isWeapon || (isOffHand && damageTypes.size > 0) || (isBionic && damageTypes.size > 0);
    const flatDamageAllowed = isWeapon || (isOffHand && damageTypes.size > 0);

    return {
        type,
        slot,
        isWeapon,
        isArmor,
        isOffHand,
        isBionic,
        isChip,
        isMaterial,
        isComponent,
        damageTypes,
        damageGroups,
        allowedWeaponLocalDamageTypes,
        offensiveAllowed,
        flatDamageAllowed
    };
}

function isItemEligibleForRandomModifiers(item) {
    const ctx = getModifierContext(item);
    if (ctx.isMaterial || ctx.isComponent || ctx.isChip) return false;
    return ctx.isWeapon || ctx.isArmor || ctx.isOffHand || ctx.isBionic;
}

function getEligibleRandomModifiers(item) {
    const ctx = getModifierContext(item);
    return RANDOM_MODIFIER_DEFINITIONS.filter(def => def.eligibility(ctx));
}

function asModifierRange(value) {
    if (Array.isArray(value) && value.length === 2) {
        return { min: Number(value[0]), max: Number(value[1]) };
    }
    if (value && typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
        return { min: Number(value.min), max: Number(value.max) };
    }
    return null;
}

function rollValueFromModifierRange(range) {
    const min = Number(range.min);
    const max = Number(range.max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    const hasDecimals = min % 1 !== 0 || max % 1 !== 0;
    if (hasDecimals) {
        return Number(getRandomFloat(min, max).toFixed(2));
    }
    return getRandomInt(Math.round(min), Math.round(max));
}

function addValueAtPath(target, path, value) {
    const parts = path.split('.');
    let node = target;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (node[key] === undefined || node[key] === null || typeof node[key] !== 'object') {
            node[key] = {};
        }
        node = node[key];
    }
    const last = parts[parts.length - 1];
    const current = typeof node[last] === 'number' ? node[last] : 0;
    node[last] = current + value;
}

function applyRandomModifierValue(item, definition, rolledValue) {
    const ctx = getModifierContext(item);
    if (ctx.isWeapon && definition.statPath.startsWith('damageTypes.')) {
        const type = definition.statPath.split('.')[1];
        addValueAtPath(item, `weaponLocalFlatDamage.${type}`, rolledValue);
        return rolledValue;
    }
    if (ctx.isWeapon && definition.statPath.startsWith('statModifiers.damageTypes.')) {
        const type = definition.statPath.split('.')[2];
        addValueAtPath(item, `weaponLocalTypeIncrease.${type}`, rolledValue);
        return rolledValue;
    }
    if (ctx.isWeapon && definition.statPath.startsWith('statModifiers.damageGroups.')) {
        const group = definition.statPath.split('.')[2];
        addValueAtPath(item, `weaponLocalGroupIncrease.${group}`, rolledValue);
        return rolledValue;
    }
    if (ctx.isWeapon && definition.statPath === 'attackSpeedModifier') {
        addValueAtPath(item, 'weaponLocalAttackSpeedPercent', rolledValue);
        return rolledValue;
    }
    if (definition.applyType === 'conversion') {
        item.weaponDamageConversion = {
            source: definition.conversionSource,
            target: definition.conversionTarget,
            percent: 100
        };
        return `${definition.conversionSource}->${definition.conversionTarget}`;
    }

    if (definition.applyType === 'topLevelPercent') {
        const fraction = Number((rolledValue / 100).toFixed(4));
        addValueAtPath(item, definition.statPath, fraction);
        if (definition.statPath === 'healthBonusPercent') {
            item.healthBonusPercentDisplay = Number((((item.healthBonusPercent || 0) * 100)).toFixed(2));
        } else if (definition.statPath === 'energyShieldBonusPercent') {
            item.energyShieldBonusPercentDisplay = Number((((item.energyShieldBonusPercent || 0) * 100)).toFixed(2));
        } else if (definition.statPath === 'attackSpeedModifier') {
            item.attackSpeedModifierPercent = Number((((item.attackSpeedModifier || 0) * 100)).toFixed(2));
        }
        return fraction;
    }

    if (definition.applyType === 'float') {
        addValueAtPath(item, definition.statPath, Number(rolledValue.toFixed(2)));
        return Number(rolledValue.toFixed(2));
    }

    // flat + statModifierPercent use integer-like additive values
    addValueAtPath(item, definition.statPath, rolledValue);
    return rolledValue;
}

function rollRandomModifiers(item, template) {
    if (!isItemEligibleForRandomModifiers(item)) return;
    if (template && template.disableRandomModifiers === true) return;

    const level = normalizeGeneratedItemLevel(item.levelRequirement);
    const desiredCount = getModifierCountForLevel(level);
    const eligible = getEligibleRandomModifiers(item);
    if (!eligible.length || desiredCount <= 0) return;

    const available = eligible.slice();
    const rolled = [];
    const targetCount = Math.min(desiredCount, available.length);

    for (let i = 0; i < targetCount; i++) {
        if (!available.length) break;
        const pickIndex = getRandomInt(0, available.length - 1);
        const modifier = available.splice(pickIndex, 1)[0];
        const grade = getModifierGradeForLevel(level);
        const gradeRange = asModifierRange(modifier.grades[grade]);
        if (!gradeRange) continue;

        const rolledBaseValue = rollValueFromModifierRange(gradeRange);
        if (rolledBaseValue === null) continue;

        const appliedValue = applyRandomModifierValue(item, modifier, rolledBaseValue);
        rolled.push({
            id: modifier.id,
            displayName: modifier.displayName,
            grade,
            gradeLabel: getModifierGradeLabel(grade),
            value: appliedValue,
            displayValue: rolledBaseValue,
            statPath: modifier.statPath,
            isPercent: !!modifier.isPercent
        });

        if (modifier.applyType === 'conversion') {
            for (let j = available.length - 1; j >= 0; j--) {
                if (available[j].applyType === 'conversion') {
                    available.splice(j, 1);
                }
            }
        }
    }

    if (rolled.length > 0) {
        item.rolledModifiers = rolled;
    }
}

function getRandomModifierPreviewInfo(template) {
    if (!template || !isItemEligibleForRandomModifiers(template)) return null;
    const level = normalizeGeneratedItemLevel(template.levelRequirement);
    const eligible = getEligibleRandomModifiers(template);
    if (!eligible.length) return null;
    return {
        level,
        countRange: getModifierCountRangeForLevel(level),
        maxGrade: getMaxModifierGradeForLevel(level),
        maxGradeLabel: getModifierGradeLabel(getMaxModifierGradeForLevel(level))
    };
}

window.getRandomModifierPreviewInfo = getRandomModifierPreviewInfo;
window.getModifierGradeLabel = getModifierGradeLabel;

function generateItemInstance(template) {
    const item = JSON.parse(JSON.stringify(template));
    const isWeaponTemplate = ((template.type || '').toLowerCase() === 'weapon') || template.slot === 'mainHand';

    // Helpers
    const asNumberRange = (value) => {
        // Accepts "min-max" string, {min,max}, or number; always returns {min,max} numbers
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') {
            const parts = value.split('-').map(p => p.trim());
            if (parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
                return { min: parseFloat(parts[0]), max: parseFloat(parts[1]) };
            }
            // If not in expected format, ignore
            return null;
        }
        if (typeof value === 'number') {
            return { min: value, max: value };
        }
        if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
            return { min: Number(value.min), max: Number(value.max) };
        }
        return null;
    };

    const rollFrom = (value, preferFloat = false) => {
        const range = asNumberRange(value);
        if (!range) return undefined;
        if (preferFloat || (range.min % 1 !== 0) || (range.max % 1 !== 0)) {
            return getRandomFloat(range.min, range.max);
        }
        return getRandomInt(Math.round(range.min), Math.round(range.max));
    };

    const rollPercentToFraction = (value) => {
        const rolled = rollFrom(value, false);
        if (rolled === undefined) return undefined;
        return Number((rolled / 100).toFixed(4));
    };

    const parsePickCount = (pickSpec) => {
        if (pickSpec === undefined || pickSpec === null) return 1;
        if (typeof pickSpec === 'number') return Math.max(0, Math.floor(pickSpec));
        const range = asNumberRange(pickSpec);
        if (range) return getRandomInt(Math.round(range.min), Math.round(range.max));
        return 1;
    };

    const ensurePathObj = (target, pathParts) => {
        let node = target;
        for (let i = 0; i < pathParts.length - 1; i++) {
            const key = pathParts[i];
            if (node[key] === undefined || node[key] === null || typeof node[key] !== 'object') {
                node[key] = {};
            }
            node = node[key];
        }
        return node;
    };

    const percentTopLevelKeys = new Set([
        'healthBonusPercent', 'energyShieldBonusPercent',
        'attackSpeedModifier', 'criticalChanceModifier', 'criticalMultiplierModifier'
    ]);

    // 1) Base/meta fields commonly used by the rest of the system
    // Support bAttackSpeed as fixed number or range string/object
    if (template.bAttackSpeed !== undefined) {
        const maybe = rollFrom(template.bAttackSpeed, true);
        item.bAttackSpeed = (maybe !== undefined) ? Number(parseFloat(maybe).toFixed(2)) : template.bAttackSpeed;
    }

    // 2) Damage types (flat)
    const baseDamageSource = isWeaponTemplate
        ? (template.weaponBaseDamage || template.baseDamageTypes || template.damageTypes)
        : template.damageTypes;
    if (baseDamageSource && typeof baseDamageSource === 'object') {
        const rolledBase = {};
        for (const rawType in baseDamageSource) {
            const type = rawType === 'mental' ? 'slashing' : rawType === 'magnetic' ? 'electric' : rawType === 'chemical' ? 'corrosive' : rawType;
            const rolled = rollFrom(baseDamageSource[rawType]);
            rolledBase[type] = (rolled !== undefined) ? rolled : Number(baseDamageSource[rawType]) || 0;
        }
        if (isWeaponTemplate) {
            item.weaponBaseDamage = rolledBase;
            delete item.baseDamageTypes;
            delete item.damageTypes;
        } else {
            item.damageTypes = rolledBase;
        }
    }

    // 3) Defense types (flat)
    if (template.defenseTypes) {
        item.defenseTypes = {};
        for (const defenseType in template.defenseTypes) {
            const rolled = rollFrom(template.defenseTypes[defenseType]);
            item.defenseTypes[defenseType] = (rolled !== undefined) ? rolled : Number(template.defenseTypes[defenseType]) || 0;
        }
    }

    // 4) Percentage damage modifiers by type/group (kept under statModifiers)
    if (template.statModifiers && (template.statModifiers.damageTypes || template.statModifiers.damageGroups)) {
        if (!item.statModifiers) item.statModifiers = {};
        // Type-specific %
        if (template.statModifiers.damageTypes) {
            item.statModifiers.damageTypes = {};
            for (const dmgType in template.statModifiers.damageTypes) {
                const rolled = rollFrom(template.statModifiers.damageTypes[dmgType]);
                item.statModifiers.damageTypes[dmgType] = (rolled !== undefined) ? rolled : Number(template.statModifiers.damageTypes[dmgType]) || 0;
            }
        }
        // Group-specific %
        if (template.statModifiers.damageGroups) {
        item.statModifiers.damageGroups = {};
            for (const group in template.statModifiers.damageGroups) {
                const rolled = rollFrom(template.statModifiers.damageGroups[group]);
                item.statModifiers.damageGroups[group] = (rolled !== undefined) ? rolled : Number(template.statModifiers.damageGroups[group]) || 0;
            }
        }
    }

    // 5) Common flat stats and percent stats at top-level
    const topLevelSpecs = [
        // [key, type] where type: 'int' | 'float' | 'percent'
        ['healthBonus', 'int'],
        ['energyShieldBonus', 'int'],
        ['healthBonusPercent', 'percent'],
        ['energyShieldBonusPercent', 'percent'],
        ['attackSpeedModifier', 'percent'],
        ['criticalChanceModifier', 'percent'],
        ['criticalMultiplierModifier', 'percent'],
        ['precision', 'int'],
        ['deflection', 'int'],
        ['healthRegen', 'float'],
        ['armorEfficiency', 'int'],
        ['weaponEfficiency', 'int'],
        ['bionicEfficiency', 'int'],
        ['bionicSync', 'int'],
        ['comboAttack', 'int'],
        ['comboEffectiveness', 'int'],
        ['additionalComboAttacks', 'int'],
        ['armorPenetration', 'int']
    ];

    for (const [key, kind] of topLevelSpecs) {
        if (template[key] !== undefined) {
            if (kind === 'percent') {
                const frac = rollPercentToFraction(template[key]);
                if (frac !== undefined) {
                    item[key] = frac;
                    // Provide display helper for UI when it makes sense
                    if (key === 'attackSpeedModifier') {
                        // store rolled percent for tooltip clarity
                        const pct = rollFrom(template[key]);
                        if (pct !== undefined) item.attackSpeedModifierPercent = pct;
                    }
                    if (key === 'healthBonusPercent') {
                        const pct = rollFrom(template[key]);
                        if (pct !== undefined) item.healthBonusPercentDisplay = pct;
                    }
                    if (key === 'energyShieldBonusPercent') {
                        const pct = rollFrom(template[key]);
                        if (pct !== undefined) item.energyShieldBonusPercentDisplay = pct;
                    }
                } else if (typeof template[key] === 'number') {
                    // Fallback: already a fraction
                    item[key] = template[key];
                }
            } else if (kind === 'float') {
                const rolled = rollFrom(template[key], true);
                if (rolled !== undefined) item[key] = Number(parseFloat(rolled).toFixed(2));
                else if (typeof template[key] === 'number') item[key] = template[key];
            } else {
                const rolled = rollFrom(template[key]);
                if (rolled !== undefined) item[key] = rolled;
                else if (typeof template[key] === 'number') item[key] = template[key];
            }
        }
    }

    // 6) General statModifiers (catch-all) - roll any numeric-like values
    if (template.statModifiers) {
        if (!item.statModifiers) item.statModifiers = {};
        const ignored = new Set(['damageTypes', 'damageGroups']);
        for (const statKey in template.statModifiers) {
            if (ignored.has(statKey)) continue;
            const value = template.statModifiers[statKey];
            // Prefer int rolls unless decimals are provided or requested
            const preferFloat = typeof value === 'string' && value.includes('.');
            const rolled = rollFrom(value, preferFloat);
            if (rolled !== undefined) item.statModifiers[statKey] = preferFloat ? Number(parseFloat(rolled).toFixed(2)) : rolled;
            else if (typeof value === 'number') item.statModifiers[statKey] = value;
        }
        // Mirror attackSpeedModifier to top-level if provided only inside statModifiers (for compatibility)
        if (item.statModifiers.attackSpeedModifier !== undefined && item.attackSpeedModifier === undefined) {
            // If provided as percent number (e.g., 10), convert to fraction
            const v = item.statModifiers.attackSpeedModifier;
            item.attackSpeedModifier = typeof v === 'number' && v > 1 ? Number((v / 100).toFixed(4)) : v;
        }
    }

    // 6b) Backward compatibility for legacy *Range fields and older names
    // - If new keys are not provided, consume the legacy ones
    const legacyPercentRanges = [
        ['attackSpeedModifier', 'attackSpeedModifierRange'],
        ['criticalChanceModifier', 'criticalChanceModifierRange'],
        ['criticalMultiplierModifier', 'criticalMultiplierModifierRange'],
        ['healthBonusPercent', 'healthBonusPercentRange'],
        ['energyShieldBonusPercent', 'energyShieldBonusPercentRange']
    ];
    for (const [newKey, legacyKey] of legacyPercentRanges) {
        if (item[newKey] === undefined && template[legacyKey] !== undefined) {
            const pct = rollFrom(template[legacyKey]);
            if (pct !== undefined) {
                const frac = Number((pct / 100).toFixed(4));
                item[newKey] = frac;
                if (newKey === 'attackSpeedModifier') item.attackSpeedModifierPercent = pct;
                if (newKey === 'healthBonusPercent') item.healthBonusPercentDisplay = pct;
                if (newKey === 'energyShieldBonusPercent') item.energyShieldBonusPercentDisplay = pct;
            }
        }
    }

    // Legacy: map attackSpeed -> attackSpeedModifier (supports fraction or percent)
    if (item.attackSpeedModifier === undefined && template.attackSpeed !== undefined) {
        const range = asNumberRange(template.attackSpeed);
        if (range) {
            const isFractionRange = Math.abs(range.min) <= 1 && Math.abs(range.max) <= 1;
            const rolled = rollFrom(template.attackSpeed, true);
            if (rolled !== undefined) {
                item.attackSpeedModifier = Number((isFractionRange ? rolled : rolled / 100).toFixed(4));
                item.attackSpeedModifierPercent = isFractionRange ? Math.round(rolled * 100) : Math.round(rolled);
            }
        } else if (typeof template.attackSpeed === 'number') {
            const v = template.attackSpeed;
            const isFraction = Math.abs(v) <= 1;
            item.attackSpeedModifier = Number((isFraction ? v : v / 100).toFixed(4));
            item.attackSpeedModifierPercent = isFraction ? Math.round(v * 100) : Math.round(v);
        }
    }

    // Legacy: map criticalChance -> criticalChanceModifier (fraction or percent)
    if (item.criticalChanceModifier === undefined && template.criticalChance !== undefined) {
        const range = asNumberRange(template.criticalChance);
        if (range) {
            const isFractionRange = Math.abs(range.min) <= 1 && Math.abs(range.max) <= 1;
            const rolled = rollFrom(template.criticalChance, true);
            if (rolled !== undefined) {
                item.criticalChanceModifier = Number((isFractionRange ? rolled : rolled / 100).toFixed(4));
            }
        } else if (typeof template.criticalChance === 'number') {
            const v = template.criticalChance;
            const isFraction = Math.abs(v) <= 1;
            item.criticalChanceModifier = Number((isFraction ? v : v / 100).toFixed(4));
        }
    }

    // Legacy: map criticalMultiplier -> criticalMultiplierModifier (fraction or percent)
    if (item.criticalMultiplierModifier === undefined && template.criticalMultiplier !== undefined) {
        const range = asNumberRange(template.criticalMultiplier);
        if (range) {
            const isFractionRange = Math.abs(range.min) <= 1 && Math.abs(range.max) <= 1;
            const rolled = rollFrom(template.criticalMultiplier, true);
            if (rolled !== undefined) {
                item.criticalMultiplierModifier = Number((isFractionRange ? rolled : rolled / 100).toFixed(4));
            }
        } else if (typeof template.criticalMultiplier === 'number') {
            const v = template.criticalMultiplier;
            const isFraction = Math.abs(v) <= 1;
            item.criticalMultiplierModifier = Number((isFraction ? v : v / 100).toFixed(4));
        }
    }

    // 7) Passive bonuses
    if (template.passiveBonuses) {
        item.passiveBonuses = {};
        for (const passiveName in template.passiveBonuses) {
            const rolled = rollFrom(template.passiveBonuses[passiveName]);
            if (rolled !== undefined) item.passiveBonuses[passiveName] = rolled;
            else if (typeof template.passiveBonuses[passiveName] === 'number') item.passiveBonuses[passiveName] = template.passiveBonuses[passiveName];
        }
    }

    // 7b) Roll groups (mod pools) - choose N from a list of possible mods
    // Schema:
    // rollGroups: [
    //   { pick: 1 | "1-2" | {min,max}, from: [ { path: 'damageTypes.kinetic', value: '10-20' }, ... ] }
    // ]
    if (Array.isArray(template.rollGroups)) {
        for (const group of template.rollGroups) {
            if (!group || !Array.isArray(group.from) || group.from.length === 0) continue;
            const pickCount = parsePickCount(group.pick);
            // Create a shallow copy and shuffle
            const options = group.from.slice();
            for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [options[i], options[j]] = [options[j], options[i]];
            }
            const chosen = options.slice(0, Math.min(pickCount, options.length));
            for (const choice of chosen) {
                if (!choice || typeof choice.path !== 'string') continue;
                const effectivePath = (isWeaponTemplate && choice.path.startsWith('damageTypes.'))
                    ? choice.path.replace('damageTypes.', 'weaponLocalFlatDamage.')
                    : (isWeaponTemplate && choice.path.startsWith('statModifiers.damageTypes.'))
                        ? choice.path.replace('statModifiers.damageTypes.', 'weaponLocalTypeIncrease.')
                        : (isWeaponTemplate && choice.path.startsWith('statModifiers.damageGroups.'))
                            ? choice.path.replace('statModifiers.damageGroups.', 'weaponLocalGroupIncrease.')
                            : choice.path;
                const parts = effectivePath.split('.');
                const key = parts[parts.length - 1];
                let rolledVal;
                // Convert for top-level percent keys only
                if (parts.length === 1 && percentTopLevelKeys.has(key)) {
                    rolledVal = rollPercentToFraction(choice.value);
                    if (rolledVal === undefined && typeof choice.value === 'number') {
                        rolledVal = Number((choice.value > 1 ? choice.value / 100 : choice.value).toFixed(4));
                    }
                } else if (key === 'healthRegen') {
                    const v = rollFrom(choice.value, true);
                    rolledVal = v !== undefined ? Number(parseFloat(v).toFixed(2)) : undefined;
                } else {
                    rolledVal = rollFrom(choice.value);
                }
                if (rolledVal === undefined && typeof choice.value === 'number') rolledVal = choice.value;
                if (rolledVal === undefined) continue;

                const parent = ensurePathObj(item, parts);
                parent[key] = rolledVal;
            }
        }
    }

    // 8) Level requirement support (number, "min-max", or {min,max})
    if (template.levelRequirement !== undefined) {
        const rolled = rollFrom(template.levelRequirement);
        if (rolled !== undefined) item.levelRequirement = rolled;
        else if (typeof template.levelRequirement === 'number') item.levelRequirement = template.levelRequirement;
    }

    // 9) Data-driven random modifiers
    rollRandomModifiers(item, template);

    // 10) Wires (Sockets) rolling
    if (template.wires && typeof template.wires === 'object') {
        const totalSlots = rollFrom(template.wires.totalSlots);
        const maxTotal = (typeof totalSlots === 'number' && totalSlots > 0) ? Math.floor(totalSlots) : 0;
        const colorsSpec = template.wires.colors || {};
        const colorCaps = {
            red: rollFrom(colorsSpec.red),
            green: rollFrom(colorsSpec.green),
            blue: rollFrom(colorsSpec.blue),
            black: rollFrom(colorsSpec.black)
        };
        const blackMax = rollFrom(template.wires.blackSlotsMax);
        const resolvedCap = (v) => (typeof v === 'number' ? Math.max(0, Math.floor(v)) : undefined);
        const caps = {
            red: resolvedCap(colorCaps.red),
            green: resolvedCap(colorCaps.green),
            blue: resolvedCap(colorCaps.blue),
            black: resolvedCap(colorCaps.black)
        };
        const blackLimit = resolvedCap(blackMax);

        // Build a pool of possible colors honoring per-color caps
        const chosen = [];
        const counts = { red: 0, green: 0, blue: 0, black: 0 };
        const colorList = ['red', 'green', 'blue', 'black'];
        for (let i = 0; i < maxTotal; i++) {
            // Build allowed choices for this slot
            const allowed = colorList.filter(c => (caps[c] === undefined || counts[c] < caps[c]));
            if (allowed.length === 0) break;
            // Prefer non-black if black limit reached
            const filtered = allowed.filter(c => c !== 'black' || (blackLimit === undefined || counts.black < blackLimit));
            const pool = filtered.length > 0 ? filtered : allowed;
            const pickIndex = getRandomInt(0, pool.length - 1);
            const color = pool[pickIndex];
            counts[color] += 1;
            chosen.push({ color });
        }
        item.rolledWires = chosen; // runtime sockets
        item.wires = template.wires; // keep template for reference
    }

    // Quantity default
    if (typeof item.quantity === 'undefined') {
        item.quantity = 1;
    }

    return item;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}
