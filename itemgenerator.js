const RANDOM_MODIFIER_GRADE_WEIGHTS = [
    { minLevel: 1, maxLevel: 10, weights: [{ grade: 1, weight: 100 }] },
    { minLevel: 11, maxLevel: 20, weights: [{ grade: 1, weight: 35 }, { grade: 2, weight: 65 }] },
    { minLevel: 21, maxLevel: 30, weights: [{ grade: 1, weight: 10 }, { grade: 2, weight: 45 }, { grade: 3, weight: 45 }] },
    { minLevel: 31, maxLevel: 40, weights: [{ grade: 2, weight: 15 }, { grade: 3, weight: 45 }, { grade: 4, weight: 40 }] },
    { minLevel: 41, maxLevel: 50, weights: [{ grade: 3, weight: 15 }, { grade: 4, weight: 45 }, { grade: 5, weight: 40 }] }
];

const RANDOM_MODIFIER_COUNT_WEIGHTS = [
    { minLevel: 1, maxLevel: 10, weights: [{ count: 1, weight: 90 }, { count: 2, weight: 10 }] },
    { minLevel: 11, maxLevel: 20, weights: [{ count: 2, weight: 80 }, { count: 3, weight: 20 }] },
    { minLevel: 21, maxLevel: 30, weights: [{ count: 2, weight: 55 }, { count: 3, weight: 45 }] },
    { minLevel: 31, maxLevel: 40, weights: [{ count: 3, weight: 80 }, { count: 4, weight: 20 }] },
    { minLevel: 41, maxLevel: 50, weights: [{ count: 3, weight: 60 }, { count: 4, weight: 40 }] }
];

const BIONIC_MODIFIER_COUNT_WEIGHTS = [
    { minLevel: 1, maxLevel: 10, weights: [{ count: 1, weight: 100 }] },
    { minLevel: 11, maxLevel: 25, weights: [{ count: 1, weight: 80 }, { count: 2, weight: 20 }] },
    { minLevel: 26, maxLevel: 40, weights: [{ count: 1, weight: 55 }, { count: 2, weight: 45 }] },
    { minLevel: 41, maxLevel: 50, weights: [{ count: 2, weight: 100 }] }
];

const GENERATOR_DAMAGE_TYPE_TO_GROUP = {
    kinetic: 'physical',
    slashing: 'physical',
    pyro: 'elemental',
    cryo: 'elemental',
    electric: 'elemental',
    corrosive: 'chemical',
    radiation: 'chemical'
};

const GENERATOR_DAMAGE_GROUP_TO_TYPES = {
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

function getBionicModifierCountForLevel(level) {
    const bucket = getWeightedBucket(level, BIONIC_MODIFIER_COUNT_WEIGHTS);
    return getRandomWeightEntry(bucket.weights).count;
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

function getBionicModifierCountRangeForLevel(level) {
    const bucket = getWeightedBucket(level, BIONIC_MODIFIER_COUNT_WEIGHTS);
    const counts = bucket.weights.map(entry => entry.count).sort((a, b) => a - b);
    const min = counts[0];
    const max = counts[counts.length - 1];
    return min === max ? `${min}` : `${min}-${max}`;
}

function getDamageTypesFromItem(item) {
    const result = new Set();
    if (!item || typeof item !== 'object') return result;
    const sources = [
        item.weaponBaseDamage,
        item.baseDamageTypes,
        item.damageTypes,
        item.statModifiers?.damageTypes
    ].filter(source => source && typeof source === 'object');
    sources.forEach(source => {
        Object.keys(source).forEach(rawType => {
            const type = rawType === 'mental' ? 'slashing' : rawType === 'magnetic' ? 'electric' : rawType === 'chemical' ? 'corrosive' : rawType;
            if (!Object.prototype.hasOwnProperty.call(GENERATOR_DAMAGE_TYPE_TO_GROUP, type)) return;
            const value = source[rawType];
            const numeric = typeof value === 'number'
                ? value
                : (value && typeof value === 'object' && typeof value.min === 'number' ? value.min : 0);
            if (numeric > 0) result.add(type);
        });
    });
    return result;
}

function getDamageGroupsFromDamageTypes(damageTypes) {
    const groups = new Set();
    damageTypes.forEach(type => {
        const group = GENERATOR_DAMAGE_TYPE_TO_GROUP[type];
        if (group) groups.add(group);
    });
    return groups;
}

function createModifierDefinition(config) {
    return {
        id: config.id,
        displayName: config.displayName,
        family: config.family || config.id,
        statPath: config.statPath,
        applyType: config.applyType,
        grades: config.grades,
        isPercent: !!config.isPercent,
        minLevel: Math.max(1, Number(config.minLevel) || 1),
        weight: Math.max(1, Number(config.weight) || 100),
        valueMultiplier: config.valueMultiplier,
        eligibility: config.eligibility
    };
}

function getDefensiveAffixMultiplier(ctx, emphasis = 'standard') {
    const slotScale = {
        chest: 1.25,
        legs: 1.1,
        head: 0.95,
        feet: 0.9,
        gloves: 0.7,
        offHand: 1,
        bionic: 0.65
    }[ctx.slot] || 1;
    if (emphasis === 'legs' && ctx.slot === 'legs') return slotScale * 1.15;
    if (emphasis === 'feet' && ctx.slot === 'feet') return slotScale * 1.2;
    return slotScale;
}

function inferAffixDamageTypes(item) {
    const explicit = getDamageTypesFromItem(item);
    if (explicit.size > 0) return explicit;
    const name = String(item?.name || '').toLowerCase();
    const inferred = new Set();
    const tests = {
        kinetic: /(kinetic|impact|mass|titan|alloy|crusher|piston|rail|bulwark|brace)/,
        slashing: /(slash|blade|edge|serrat|phase|monowire|nanofiber|parry|cutter)/,
        pyro: /(pyro|fire|flame|heat|thermal|furnace|starfire|ember|photon|combust)/,
        cryo: /(cryo|frost|coolant|refriger|glacier|entropy|freeze)/,
        electric: /(electric|shock|arc|lightning|storm|static|faraday|capacitor|ion|ground)/,
        corrosive: /(corros|acid|caustic|toxin|biohazard|dissolv|molecular|chemical)/,
        radiation: /(radiation|radium|gamma|isotope|irradiat|reactor|containment|singularity)/
    };
    Object.entries(tests).forEach(([type, pattern]) => {
        if (pattern.test(name)) inferred.add(type);
    });
    return inferred;
}

function inferBionicAffixRoles(item) {
    const name = String(item?.name || '').toLowerCase();
    const roles = new Set(['utility']);
    if (/(booster|barbs|crit)/.test(name)) roles.add('offense');
    if (/(reaction|crit)/.test(name)) roles.add('critical');
    if (/(barbs|reaction)/.test(name)) roles.add('combo');
    if (/(health|exchanger)/.test(name)) roles.add('defense');
    if (inferAffixDamageTypes(item).size > 0) roles.add('offense');
    return roles;
}

function createSharedModifierDefinitions() {
    const defs = [];
    const grade = (g1, g2, g3, g4, g5) => ({
        1: g1, 2: g2, 3: g3, 4: g4, 5: g5
    });
    const defensive = (ctx) => ctx.isArmor || ctx.isOffHand || ctx.isBionic;
    const armorSlot = (ctx, ...slots) => slots.includes(ctx.slot);
    const themedTypeAllowed = (ctx, type) => (
        ctx.affixDamageTypes.has(type)
        || ((ctx.slot === 'gloves' || ctx.isBionic) && ctx.affixDamageTypes.size === 0)
    );

    defs.push(createModifierDefinition({
        id: 'flatMaxHealth',
        displayName: 'Max Health',
        family: 'maximumHealth',
        statPath: 'healthBonus',
        applyType: 'flat',
        grades: grade([8, 25], [30, 80], [90, 220], [240, 520], [550, 1000]),
        valueMultiplier: (ctx) => getDefensiveAffixMultiplier(ctx),
        eligibility: defensive
    }));

    defs.push(createModifierDefinition({
        id: 'percentMaxHealth',
        displayName: 'Max Health',
        family: 'maximumHealth',
        statPath: 'healthBonusPercent',
        applyType: 'topLevelPercent',
        isPercent: true,
        grades: grade([2, 4], [4, 7], [7, 11], [11, 16], [16, 24]),
        valueMultiplier: (ctx) => getDefensiveAffixMultiplier(ctx),
        eligibility: defensive
    }));

    defs.push(createModifierDefinition({
        id: 'flatEnergyShield',
        displayName: 'Energy Shield',
        family: 'energyShield',
        statPath: 'energyShieldBonus',
        applyType: 'flat',
        grades: grade([6, 20], [25, 70], [80, 180], [200, 450], [475, 850]),
        valueMultiplier: (ctx) => getDefensiveAffixMultiplier(ctx),
        eligibility: defensive
    }));

    defs.push(createModifierDefinition({
        id: 'percentEnergyShield',
        displayName: 'Energy Shield',
        family: 'energyShield',
        statPath: 'energyShieldBonusPercent',
        applyType: 'topLevelPercent',
        isPercent: true,
        grades: grade([2, 4], [4, 7], [7, 11], [11, 16], [16, 24]),
        valueMultiplier: (ctx) => getDefensiveAffixMultiplier(ctx),
        eligibility: defensive
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
            family: resistanceKey,
            statPath: `defenseTypes.${resistanceKey}`,
            applyType: 'flat',
            isPercent: true,
            grades: grade([1, 3], [3, 6], [6, 10], [10, 15], [15, 22]),
            valueMultiplier: (ctx) => getDefensiveAffixMultiplier(ctx),
            eligibility: defensive
        }));
    });

    defs.push(createModifierDefinition({
        id: 'allResistances',
        displayName: 'All Resistances',
        family: 'allResistances',
        statPath: 'defenseTypes',
        applyType: 'allResistances',
        isPercent: true,
        minLevel: 21,
        weight: 25,
        grades: grade([1, 1], [1, 2], [2, 4], [4, 6], [6, 9]),
        eligibility: (ctx) => ctx.slot === 'chest'
    }));

    Object.keys(GENERATOR_DAMAGE_TYPE_TO_GROUP).forEach(type => {
        const typeDisplay = type.charAt(0).toUpperCase() + type.slice(1);
        defs.push(createModifierDefinition({
            id: `weaponDamageTypePercent_${type}`,
            displayName: `Weapon ${typeDisplay} Damage`,
            family: 'weaponTypeDamage',
            statPath: `statModifiers.damageTypes.${type}`,
            applyType: 'statModifierPercent',
            isPercent: true,
            grades: grade([4, 8], [8, 14], [14, 22], [22, 32], [32, 45]),
            eligibility: (ctx) => ctx.isWeapon && ctx.allowedWeaponLocalDamageTypes.has(type)
        }));
        defs.push(createModifierDefinition({
            id: `globalDamageTypePercent_${type}`,
            displayName: `${typeDisplay} Damage`,
            family: 'globalTypeDamage',
            statPath: `statModifiers.damageTypes.${type}`,
            applyType: 'statModifierPercent',
            isPercent: true,
            grades: grade([3, 6], [6, 11], [11, 17], [17, 25], [25, 36]),
            eligibility: (ctx) => (
                (ctx.slot === 'gloves' || ctx.isOffHand)
                && themedTypeAllowed(ctx, type)
            )
        }));
    });

    Object.keys(GENERATOR_DAMAGE_GROUP_TO_TYPES).forEach(group => {
        const nameMap = {
            physical: 'Physical Damage',
            elemental: 'Elemental Damage',
            chemical: 'Chemical Damage'
        };
        defs.push(createModifierDefinition({
            id: `globalDamageGroupPercent_${group}`,
            displayName: nameMap[group],
            family: 'globalGroupDamage',
            statPath: `statModifiers.damageGroups.${group}`,
            applyType: 'statModifierPercent',
            isPercent: true,
            grades: grade([3, 5], [5, 8], [8, 12], [12, 17], [17, 23]),
            eligibility: (ctx) => ctx.isBionic
                && ctx.bionicRoles.has('offense')
                && (ctx.damageGroups.size === 0 || ctx.damageGroups.has(group))
        }));
    });

    Object.keys(GENERATOR_DAMAGE_GROUP_TO_TYPES).forEach(group => {
        const nameMap = {
            physical: 'Physical Damage',
            elemental: 'Elemental Damage',
            chemical: 'Chemical Damage'
        };
        defs.push(createModifierDefinition({
            id: `weaponDamageGroupPercent_${group}`,
            displayName: `Weapon ${nameMap[group]}`,
            family: 'weaponGroupDamage',
            statPath: `statModifiers.damageGroups.${group}`,
            applyType: 'statModifierPercent',
            isPercent: true,
            grades: grade([3, 6], [6, 11], [11, 17], [17, 25], [25, 36]),
            eligibility: (ctx) => ctx.isWeapon && ctx.damageGroups.has(group)
        }));
    });

    Object.keys(GENERATOR_DAMAGE_TYPE_TO_GROUP).forEach(type => {
        const typeDisplay = type.charAt(0).toUpperCase() + type.slice(1).replace('corrosive', 'Corrosive');
        defs.push(createModifierDefinition({
            id: `flatDamage_${type}`,
            displayName: `Weapon ${typeDisplay} Damage`,
            family: 'weaponFlatDamage',
            statPath: `damageTypes.${type}`,
            applyType: 'flat',
            grades: grade([2, 6], [7, 18], [20, 45], [50, 110], [120, 250]),
            eligibility: (ctx) => ctx.isWeapon && ctx.allowedWeaponLocalDamageTypes.has(type)
        }));
    });

    defs.push(createModifierDefinition({
        id: 'precision',
        displayName: 'Precision',
        family: 'precision',
        statPath: 'precision',
        applyType: 'flat',
        grades: grade([2, 8], [8, 18], [18, 38], [38, 75], [75, 130]),
        eligibility: (ctx) => ctx.isWeapon || ctx.slot === 'gloves' || ctx.slot === 'head' || ctx.slot === 'feet' || ctx.isOffHand || ctx.isBionic
    }));

    defs.push(createModifierDefinition({
        id: 'deflection',
        displayName: 'Deflection',
        family: 'deflection',
        statPath: 'deflection',
        applyType: 'flat',
        grades: grade([2, 8], [8, 18], [18, 38], [38, 75], [75, 130]),
        valueMultiplier: (ctx) => getDefensiveAffixMultiplier(
            ctx,
            ctx.slot === 'legs' ? 'legs' : (ctx.slot === 'feet' ? 'feet' : 'standard')
        ),
        eligibility: defensive
    }));

    defs.push(createModifierDefinition({
        id: 'criticalChance',
        displayName: 'Critical Chance',
        family: 'criticalChance',
        statPath: 'criticalChanceModifier',
        applyType: 'topLevelPercent',
        isPercent: true,
        grades: grade([1, 2], [2, 4], [4, 6], [6, 9], [9, 13]),
        eligibility: (ctx) => ctx.isWeapon || ctx.slot === 'gloves' || ctx.slot === 'head'
            || (ctx.isBionic && ctx.bionicRoles.has('critical'))
    }));

    defs.push(createModifierDefinition({
        id: 'criticalMultiplier',
        displayName: 'Critical Multiplier',
        family: 'criticalMultiplier',
        statPath: 'criticalMultiplierModifier',
        applyType: 'topLevelPercent',
        isPercent: true,
        grades: grade([5, 10], [10, 18], [18, 30], [30, 45], [45, 65]),
        eligibility: (ctx) => ctx.isWeapon || ctx.slot === 'gloves' || ctx.slot === 'head'
            || (ctx.isBionic && ctx.bionicRoles.has('critical'))
    }));

    defs.push(createModifierDefinition({
        id: 'attackSpeed',
        displayName: 'Weapon Attack Speed',
        family: 'attackSpeed',
        statPath: 'attackSpeedModifier',
        applyType: 'topLevelPercent',
        isPercent: true,
        grades: grade([2, 4], [4, 7], [7, 10], [10, 14], [14, 18]),
        eligibility: (ctx) => ctx.isWeapon || ctx.slot === 'gloves' || ctx.slot === 'feet'
            || (ctx.isBionic && ctx.bionicRoles.has('offense'))
    }));

    defs.push(createModifierDefinition({
        id: 'weaponEfficiency',
        displayName: 'Weapon Efficiency',
        family: 'weaponEfficiency',
        statPath: 'weaponEfficiency',
        applyType: 'flat',
        grades: grade([3, 8], [8, 16], [16, 28], [28, 45], [45, 70]),
        eligibility: (ctx) => ctx.isWeapon || ctx.slot === 'gloves' || ctx.isOffHand
    }));

    defs.push(createModifierDefinition({
        id: 'armorEfficiency',
        displayName: 'Armor Efficiency',
        family: 'armorEfficiency',
        statPath: 'armorEfficiency',
        applyType: 'flat',
        grades: grade([3, 8], [8, 16], [16, 28], [28, 45], [45, 70]),
        eligibility: (ctx) => ctx.isArmor || ctx.isOffHand || ctx.isBionic
    }));

    defs.push(createModifierDefinition({
        id: 'bionicEfficiency',
        displayName: 'Bionic Efficiency',
        family: 'bionicEfficiency',
        statPath: 'bionicEfficiency',
        applyType: 'flat',
        grades: grade([3, 8], [8, 16], [16, 28], [28, 45], [45, 70]),
        eligibility: (ctx) => ctx.isBionic
    }));

    defs.push(createModifierDefinition({
        id: 'healthRegen',
        displayName: 'Health Regen',
        family: 'healthRegen',
        statPath: 'healthRegen',
        applyType: 'float',
        grades: grade([0.5, 1.5], [1.5, 3], [3, 6], [6, 10], [10, 16]),
        valueMultiplier: (ctx) => getDefensiveAffixMultiplier(ctx, ctx.slot === 'legs' ? 'legs' : 'standard'),
        eligibility: defensive
    }));

    defs.push(createModifierDefinition({
        id: 'armorPenetration',
        displayName: 'Armor Penetration',
        family: 'armorPenetration',
        statPath: 'armorPenetration',
        applyType: 'flat',
        isPercent: true,
        grades: grade([2, 4], [4, 7], [7, 11], [11, 16], [16, 24]),
        eligibility: (ctx) => ctx.isWeapon || (ctx.isOffHand && ctx.affixDamageTypes.size > 0)
    }));

    defs.push(createModifierDefinition({
        id: 'statusApplicationChance',
        displayName: 'Status Application Chance',
        family: 'statusApplicationChance',
        statPath: 'debuffChanceBonus',
        applyType: 'topLevelPercent',
        isPercent: true,
        grades: grade([1, 2], [2, 4], [4, 7], [7, 10], [10, 14]),
        eligibility: (ctx) => ctx.isWeapon || ctx.slot === 'head' || ctx.slot === 'gloves'
            || (ctx.isBionic && ctx.bionicRoles.has('offense'))
    }));

    defs.push(createModifierDefinition({
        id: 'statusResistance',
        displayName: 'Status Resistance',
        family: 'statusResistance',
        statPath: 'statusResistance',
        applyType: 'topLevelPercent',
        isPercent: true,
        grades: grade([2, 4], [4, 7], [7, 11], [11, 16], [16, 24]),
        eligibility: (ctx) => armorSlot(ctx, 'head', 'legs', 'feet') || ctx.isBionic
    }));

    defs.push(createModifierDefinition({
        id: 'statusDurationReduction',
        displayName: 'Reduced Status Duration',
        family: 'statusDurationReduction',
        statPath: 'statusDurationReduction',
        applyType: 'topLevelPercent',
        isPercent: true,
        grades: grade([3, 6], [6, 10], [10, 16], [16, 24], [24, 34]),
        eligibility: (ctx) => armorSlot(ctx, 'chest', 'legs') || ctx.isBionic
    }));

    defs.push(createModifierDefinition({
        id: 'bionicSync',
        displayName: 'Bionic Sync',
        family: 'bionicSync',
        statPath: 'bionicSync',
        applyType: 'flat',
        isPercent: true,
        minLevel: 11,
        grades: grade([2, 4], [4, 7], [7, 11], [11, 16], [16, 24]),
        eligibility: (ctx) => ctx.isOffHand || armorSlot(ctx, 'head', 'chest', 'legs') || ctx.isBionic
    }));

    defs.push(createModifierDefinition({
        id: 'comboAttackChance',
        displayName: 'Combo Attack Chance',
        family: 'comboAttack',
        statPath: 'comboAttack',
        applyType: 'flat',
        isPercent: true,
        minLevel: 21,
        grades: grade([1, 2], [2, 4], [4, 7], [7, 10], [10, 14]),
        eligibility: (ctx) => ctx.slot === 'feet' || (ctx.isBionic && ctx.bionicRoles.has('combo'))
    }));

    defs.push(createModifierDefinition({
        id: 'comboEffectiveness',
        displayName: 'Combo Effectiveness',
        family: 'comboEffectiveness',
        statPath: 'comboEffectiveness',
        applyType: 'flat',
        isPercent: true,
        minLevel: 21,
        grades: grade([2, 4], [4, 7], [7, 12], [12, 18], [18, 26]),
        eligibility: (ctx) => ctx.isBionic && ctx.bionicRoles.has('combo')
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
    Object.keys(item?.statModifiers?.damageGroups || {}).forEach(group => {
        if (GENERATOR_DAMAGE_GROUP_TO_TYPES[group]) damageGroups.add(group);
    });
    const affixDamageTypes = inferAffixDamageTypes(item);
    const affixDamageGroups = getDamageGroupsFromDamageTypes(affixDamageTypes);
    const bionicRoles = isBionic ? inferBionicAffixRoles(item) : new Set();
    const allowedWeaponLocalDamageTypes = new Set();
    if (isWeapon) {
        damageGroups.forEach((group) => {
            (GENERATOR_DAMAGE_GROUP_TO_TYPES[group] || []).forEach((type) => allowedWeaponLocalDamageTypes.add(type));
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
        affixDamageTypes,
        affixDamageGroups,
        bionicRoles,
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

function rollValueFromModifierRange(range, random = Math.random) {
    const min = Number(range.min);
    const max = Number(range.max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    const hasDecimals = min % 1 !== 0 || max % 1 !== 0;
    if (hasDecimals) {
        return Number((min + (Math.min(0.999999, Math.max(0, random())) * (max - min))).toFixed(2));
    }
    return Math.floor(Math.min(0.999999, Math.max(0, random())) * (Math.round(max) - Math.round(min) + 1)) + Math.round(min);
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

function subtractValueAtPath(target, path, value) {
    const parts = path.split('.');
    let node = target;
    for (let index = 0; index < parts.length - 1; index++) {
        node = node?.[parts[index]];
        if (!node || typeof node !== 'object') return;
    }
    const key = parts[parts.length - 1];
    const current = Number(node?.[key]);
    if (!Number.isFinite(current)) return;
    const next = Number((current - Number(value || 0)).toFixed(6));
    if (Math.abs(next) < 0.000001) delete node[key];
    else node[key] = next;
}

function getRandomModifierStoragePath(item, definition) {
    const ctx = getModifierContext(item);
    if (ctx.isWeapon && definition.statPath.startsWith('damageTypes.')) {
        return `weaponLocalFlatDamage.${definition.statPath.split('.')[1]}`;
    }
    if (ctx.isWeapon && definition.statPath.startsWith('statModifiers.damageTypes.')) {
        return `weaponLocalTypeIncrease.${definition.statPath.split('.')[2]}`;
    }
    if (ctx.isWeapon && definition.statPath.startsWith('statModifiers.damageGroups.')) {
        return `weaponLocalGroupIncrease.${definition.statPath.split('.')[2]}`;
    }
    if (ctx.isWeapon && definition.statPath === 'attackSpeedModifier') return 'weaponLocalAttackSpeedPercent';
    return definition.statPath;
}

function removeRandomModifierValue(item, definition, appliedValue) {
    const value = Number(appliedValue);
    if (!Number.isFinite(value)) return false;
    if (definition.applyType === 'allResistances') {
        ['physicalResistance', 'elementalResistance', 'chemicalResistance']
            .forEach(type => subtractValueAtPath(item, `defenseTypes.${type}`, value));
        return true;
    }
    subtractValueAtPath(item, getRandomModifierStoragePath(item, definition), value);
    if (definition.statPath === 'healthBonusPercent') {
        item.healthBonusPercentDisplay = Number(((item.healthBonusPercent || 0) * 100).toFixed(2));
    } else if (definition.statPath === 'energyShieldBonusPercent') {
        item.energyShieldBonusPercentDisplay = Number(((item.energyShieldBonusPercent || 0) * 100).toFixed(2));
    } else if (definition.statPath === 'attackSpeedModifier' && !getModifierContext(item).isWeapon) {
        item.attackSpeedModifierPercent = Number(((item.attackSpeedModifier || 0) * 100).toFixed(2));
    }
    return true;
}

function getModifierRollRange(item, modifierOrId) {
    const modifier = typeof modifierOrId === 'string'
        ? item?.rolledModifiers?.find(candidate => candidate.id === modifierOrId)
        : modifierOrId;
    const definition = RANDOM_MODIFIER_DEFINITIONS.find(candidate => candidate.id === modifier?.id);
    const grade = Math.max(1, Math.min(5, Math.floor(Number(modifier?.grade) || 1)));
    const baseRange = definition ? asModifierRange(definition.grades[grade]) : null;
    if (!definition || !baseRange) return null;
    const multiplier = typeof definition.valueMultiplier === 'function'
        ? Math.max(0, Number(definition.valueMultiplier(getModifierContext(item))) || 1)
        : 1;
    const integerRange = Number.isInteger(baseRange.min) && Number.isInteger(baseRange.max);
    const normalize = value => integerRange ? Math.max(1, Math.round(value * multiplier)) : Number((value * multiplier).toFixed(2));
    return {
        min: normalize(baseRange.min),
        max: normalize(baseRange.max),
        grade,
        gradeLabel: getModifierGradeLabel(grade),
        isPercent: Boolean(definition.isPercent)
    };
}

function getPossibleRandomModifiers(item) {
    if (!item || !isItemEligibleForRandomModifiers(item)) return null;
    const level = Math.max(1, Math.min(50, normalizeGeneratedItemLevel(item.levelRequirement)));
    const gradeBucket = getWeightedBucket(level, RANDOM_MODIFIER_GRADE_WEIGHTS);
    const possibleGrades = [...new Set(gradeBucket.weights.map(entry => Number(entry.grade)))]
        .filter(grade => Number.isInteger(grade) && grade >= 1 && grade <= 5)
        .sort((left, right) => left - right);
    const context = getModifierContext(item);
    const modifiers = getEligibleRandomModifiers(item)
        .filter(definition => level >= definition.minLevel)
        .map(definition => {
            const multiplier = typeof definition.valueMultiplier === 'function'
                ? Math.max(0, Number(definition.valueMultiplier(context)) || 1)
                : 1;
            const grades = possibleGrades.map(grade => {
                const baseRange = asModifierRange(definition.grades[grade]);
                if (!baseRange) return null;
                const integerRange = Number.isInteger(baseRange.min) && Number.isInteger(baseRange.max);
                const normalize = value => integerRange
                    ? Math.max(1, Math.round(value * multiplier))
                    : Number((value * multiplier).toFixed(2));
                return {
                    grade,
                    gradeLabel: getModifierGradeLabel(grade),
                    min: normalize(baseRange.min),
                    max: normalize(baseRange.max)
                };
            }).filter(Boolean);
            return {
                id: definition.id,
                displayName: definition.displayName,
                isPercent: Boolean(definition.isPercent),
                grades
            };
        })
        .filter(definition => definition.grades.length > 0)
        .sort((left, right) => left.displayName.localeCompare(right.displayName));

    return {
        level,
        countRange: context.isBionic
            ? getBionicModifierCountRangeForLevel(level)
            : getModifierCountRangeForLevel(level),
        modifiers
    };
}

function rerollBoundItemModifier(item, random = Math.random) {
    if (!item?.fluxTargetModifierId || !Array.isArray(item.rolledModifiers)) return null;
    const modifier = item.rolledModifiers.find(candidate => candidate.id === item.fluxTargetModifierId);
    const definition = RANDOM_MODIFIER_DEFINITIONS.find(candidate => candidate.id === modifier?.id);
    const range = getModifierRollRange(item, modifier);
    if (!modifier || !definition || !range) return null;

    const previousDisplayValue = Number(modifier.displayValue);
    const nextDisplayValue = rollValueFromModifierRange({ min: range.min, max: range.max }, random);
    if (nextDisplayValue === null) return null;
    removeRandomModifierValue(item, definition, modifier.value);
    const nextAppliedValue = applyRandomModifierValue(item, definition, nextDisplayValue);
    modifier.value = nextAppliedValue;
    modifier.displayValue = nextDisplayValue;
    modifier.gradeLabel = getModifierGradeLabel(modifier.grade);
    return { modifier, range, previousDisplayValue, nextDisplayValue };
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
    if (definition.applyType === 'allResistances') {
        Object.keys({
            physicalResistance: true,
            elementalResistance: true,
            chemicalResistance: true
        }).forEach(type => addValueAtPath(item, `defenseTypes.${type}`, rolledValue));
        return rolledValue;
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

function getWeightedModifierIndex(modifiers) {
    const totalWeight = modifiers.reduce((sum, modifier) => sum + modifier.weight, 0);
    if (totalWeight <= 0) return 0;
    let roll = Math.random() * totalWeight;
    for (let index = 0; index < modifiers.length; index++) {
        roll -= modifiers[index].weight;
        if (roll <= 0) return index;
    }
    return modifiers.length - 1;
}

function rollRandomModifiers(item, template) {
    if (!isItemEligibleForRandomModifiers(item)) return;
    if (template && template.disableRandomModifiers === true) return;

    const level = normalizeGeneratedItemLevel(item.levelRequirement);
    const desiredCount = getModifierContext(item).isBionic
        ? getBionicModifierCountForLevel(level)
        : getModifierCountForLevel(level);
    const eligible = getEligibleRandomModifiers(item).filter(modifier => level >= modifier.minLevel);
    if (!eligible.length || desiredCount <= 0) return;

    const available = eligible.slice();
    const rolled = [];
    const targetCount = Math.min(desiredCount, available.length);

    for (let i = 0; i < targetCount; i++) {
        if (!available.length) break;
        const pickIndex = getWeightedModifierIndex(available);
        const modifier = available.splice(pickIndex, 1)[0];
        const grade = getModifierGradeForLevel(level);
        const gradeRange = asModifierRange(modifier.grades[grade]);
        if (!gradeRange) continue;

        let rolledBaseValue = rollValueFromModifierRange(gradeRange);
        if (rolledBaseValue === null) continue;
        if (typeof modifier.valueMultiplier === 'function') {
            const multiplier = Number(modifier.valueMultiplier(getModifierContext(item)) || 1);
            rolledBaseValue *= multiplier;
            rolledBaseValue = Number.isInteger(gradeRange.min) && Number.isInteger(gradeRange.max)
                ? Math.max(1, Math.round(rolledBaseValue))
                : Number(rolledBaseValue.toFixed(2));
        }

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

        for (let j = available.length - 1; j >= 0; j--) {
            if (available[j].family === modifier.family) available.splice(j, 1);
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
        countRange: getModifierContext(template).isBionic
            ? getBionicModifierCountRangeForLevel(level)
            : getModifierCountRangeForLevel(level),
        maxGrade: getMaxModifierGradeForLevel(level),
        maxGradeLabel: getModifierGradeLabel(getMaxModifierGradeForLevel(level))
    };
}

window.getRandomModifierPreviewInfo = getRandomModifierPreviewInfo;
window.getModifierGradeLabel = getModifierGradeLabel;
window.getModifierRollRange = getModifierRollRange;
window.getPossibleRandomModifiers = getPossibleRandomModifiers;
window.rerollBoundItemModifier = rerollBoundItemModifier;

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
        ['armorPenetration', 'int'],
        ['debuffChanceBonus', 'float'],
        ['debuffDurationBonus', 'float'],
        ['statusResistance', 'int'],
        ['statusDurationReduction', 'int'],
        ['damageRollFloorBonus', 'float'],
        ['directDamageMultiplier', 'float'],
        ['dotDamageMultiplier', 'float'],
        ['damageVsDebuffed', 'float'],
        ['damageTakenReduction', 'float']
    ];

    for (const [key, kind] of topLevelSpecs) {
        if (template[key] !== undefined) {
            if (kind === 'percent') {
                const frac = rollPercentToFraction(template[key]);
                if (frac !== undefined) {
                    item[key] = frac;
                    const pct = Number((frac * 100).toFixed(2));
                    // Provide display helper for UI when it makes sense
                    if (key === 'attackSpeedModifier') {
                        item.attackSpeedModifierPercent = pct;
                    }
                    if (key === 'healthBonusPercent') {
                        item.healthBonusPercentDisplay = pct;
                    }
                    if (key === 'energyShieldBonusPercent') {
                        item.energyShieldBonusPercentDisplay = pct;
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

    // 10) Wires (Sockets) rolling. Authored layouts override the universal
    // level-30+ equipment roll.
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
    } else {
        const level = normalizeGeneratedItemLevel(item.levelRequirement);
        const context = getModifierContext(item);
        const canRollWires = level >= 30
            && !context.isBionic
            && (context.isWeapon || context.isArmor || context.isOffHand);
        if (canRollWires) {
            const roll = Math.random();
            let slotCount = 0;
            if (level >= 50) {
                slotCount = roll < 0.15 ? 0 : roll < 0.75 ? 1 : roll < 0.97 ? 2 : 3;
            } else if (level >= 40) {
                slotCount = roll < 0.25 ? 0 : roll < 0.85 ? 1 : roll < 0.98 ? 2 : 3;
            } else {
                slotCount = roll < 0.45 ? 0 : roll < 0.95 ? 1 : 2;
            }

            if (slotCount > 0) {
                const ordinaryColors = ['red', 'blue', 'green'];
                item.rolledWires = Array.from({ length: slotCount }, () => ({
                    color: Math.random() < 0.06
                        ? 'black'
                        : ordinaryColors[getRandomInt(0, ordinaryColors.length - 1)]
                }));
            }
        }
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
