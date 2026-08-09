// Corebound radial passive tree. The graph and effects are generated from
// cluster blueprints so the renderer, save migration, validation, and stat
// pipeline share one authority without maintaining thousands of hand-wired IDs.

const PASSIVE_TREE_VERSION = 5;
const PASSIVE_TREE_ORIGIN_ID = 'core-origin';
const PASSIVE_TREE_SECTOR_ORDER = Object.freeze([
    'kinetic', 'slashing', 'corrosive', 'radiation', 'electric', 'cryo', 'pyro'
]);

const PASSIVE_SECTOR_DEFINITIONS = Object.freeze({
    kinetic: {
        label: 'Kinetic', angle: -90, damageType: 'kinetic', group: 'physical', resistance: 'physicalResistance',
        identity: 'Impact, reliable damage, health, and physical resistance.',
        laneNames: {
            offense: ['Kinetic Focus', 'Armorbreaker Calculus'],
            defense: ['Dense Tissue', 'Reactive Plating'],
            utility: ['Measured Force', 'Stagger Protocol']
        },
        keystones: {
            offense: { name: 'Unyielding Impact', description: 'Raise the floor of every damage roll, but reduce critical damage.', effects: { damageRollFloorBonus: 0.15, criticalMultiplier: -0.15 } },
            defense: { name: 'Mass Doctrine', description: 'Become substantially harder to kill at the cost of attack speed.', effects: { healthPercent: 18, attackSpeed: -8 } },
            utility: { name: 'Overwhelming Force', description: 'Kinetic hits apply statuses more readily, but your own evasive control suffers.', effects: { damageTypes: { kinetic: 18 }, debuffChanceBonus: 0.05, deflection: -5 } }
        },
        outerKeystones: [
            { name: 'Terminal Mass', description: 'Weapon mechanisms hit with crushing reliability, but cycle substantially slower.', effects: { weaponEfficiency: 28, damageRollFloorBonus: 0.1, attackSpeed: -12 } },
            { name: 'Inertial Fortress', description: 'Turn momentum inward for exceptional mitigation at the cost of direct damage.', effects: { damageTakenReduction: 0.1, defenseTypes: { physicalResistance: 15 }, directDamageMultiplier: -0.12 } }
        ],
        specialists: ['Ballistic Architecture', 'Siege Physiology', 'Impact Recursion']
    },
    slashing: {
        label: 'Slashing', angle: -90 + (360 / 7), damageType: 'slashing', group: 'physical', resistance: 'physicalResistance',
        identity: 'Critical strikes, wounds, damage variance, and deflection.',
        laneNames: {
            offense: ['Blade Master', 'Open Vein'],
            defense: ['Dancing Guard', 'Impossible Angle'],
            utility: ['Edge Alignment', 'Wound Cartography']
        },
        keystones: {
            offense: { name: 'Perfect Incision', description: 'Gain powerful critical scaling at the cost of maximum health.', effects: { criticalChance: 8, criticalMultiplier: 0.3, healthPercent: -8 } },
            defense: { name: 'Ghostblade Geometry', description: 'Greatly increase Deflection, but reduce maximum Energy Shield.', effects: { deflection: 18, energyShieldPercent: -12 } },
            utility: { name: 'Hemorrhagic Engine', description: 'Your damage over time is stronger while your direct hits are weaker.', effects: { dotDamageMultiplier: 0.35, directDamageMultiplier: -0.12 } }
        },
        outerKeystones: [
            { name: 'A Thousand Cuts', description: 'Combo attacks arrive readily, but every individual direct strike loses force.', effects: { comboAttack: 24, comboEffectiveness: 20, directDamageMultiplier: -0.14 } },
            { name: "Anatomist's Debt", description: 'Critical wounds can dismantle anything, but your own frame becomes fragile.', effects: { severedLimbChance: 12, maxSeveredLimbs: 1, criticalMultiplier: 0.2, healthPercent: -10 } }
        ],
        specialists: ['Monomolecular Geometry', 'Duelist Reflexes', 'Wound Engine']
    },
    corrosive: {
        label: 'Corrosive', angle: -90 + (360 / 7) * 2, damageType: 'corrosive', group: 'chemical', resistance: 'chemicalResistance',
        identity: 'Attrition, suppression, regeneration, and persistent weakening.',
        laneNames: {
            offense: ['Solvent Pressure', 'Caustic Saturation'],
            defense: ['Adaptive Membrane', 'Reactive Antidote'],
            utility: ['Rusted Timing', 'Persistent Reagent']
        },
        keystones: {
            offense: { name: 'Patient Dissolution', description: 'Trade direct hit damage for substantially stronger damage over time.', effects: { dotDamageMultiplier: 0.4, directDamageMultiplier: -0.15 } },
            defense: { name: 'Adaptive Carapace', description: 'Gain regeneration and chemical resistance at the cost of attack speed.', effects: { healthRegen: 3, defenseTypes: { chemicalResistance: 15 }, attackSpeed: -8 } },
            utility: { name: 'Total Oxidation', description: 'Corrosive statuses apply more often and persist much longer.', effects: { debuffChanceBonus: 0.05, debuffDurationBonus: 0.5 } }
        },
        outerKeystones: [
            { name: 'Closed Ecosystem', description: 'Your body recycles every toxin into life, but cannot sustain much Energy Shield.', effects: { healthRegen: 5, healthPercent: 10, energyShieldPercent: -25 } },
            { name: 'Universal Solvent', description: 'Persistent damage becomes devastating while critical strikes lose their edge.', effects: { dotDamageMultiplier: 0.3, damageVsDebuffed: 0.18, criticalChance: -6 } }
        ],
        specialists: ['Reagent Cascade', 'Mutagenic Membrane', 'Attrition Laboratory']
    },
    radiation: {
        label: 'Radiation', angle: -90 + (360 / 7) * 3, damageType: 'radiation', group: 'chemical', resistance: 'chemicalResistance',
        identity: 'Stacking decay, reflected damage, risk, and bionic amplification.',
        laneNames: {
            offense: ['Isotope Density', 'Runaway Decay'],
            defense: ['Lead Marrow', 'Half-Life Recovery'],
            utility: ['Unstable Feedback', 'Synthetic Isotope']
        },
        keystones: {
            offense: { name: 'Event Horizon Metabolism', description: 'Massively increase damage over time, but also increase damage taken.', effects: { dotDamageMultiplier: 0.45, damageTakenReduction: -0.12 } },
            defense: { name: 'Rad-Hardened Genome', description: 'Gain health and chemical resistance while sacrificing attack speed.', effects: { healthPercent: 14, defenseTypes: { chemicalResistance: 12 }, attackSpeed: -6 } },
            utility: { name: 'Synthetic Isotope Core', description: 'Greatly amplify bionics at the cost of maximum health.', effects: { bionicSync: 25, bionicEfficiency: 10, healthPercent: -10 } }
        },
        outerKeystones: [
            { name: 'Chain Reaction', description: 'Statuses spread through violent feedback, but clean direct hits are weakened.', effects: { debuffChanceBonus: 0.06, debuffDurationBonus: 0.35, directDamageMultiplier: -0.1 } },
            { name: 'Ghost in the Reactor', description: 'Bionics and Energy Shield resonate intensely while physical life withers.', effects: { bionicSync: 20, energyShieldPercent: 24, healthPercent: -15 } }
        ],
        specialists: ['Isotope Lattice', 'Reactor Symbiosis', 'Criticality Spiral']
    },
    electric: {
        label: 'Electric', angle: -90 + (360 / 7) * 4, damageType: 'electric', group: 'elemental', resistance: 'elementalResistance',
        identity: 'Attack speed, critical setup, precision, and Energy Shield.',
        laneNames: {
            offense: ['Voltage Gain', 'Critical Circuit'],
            defense: ['Capacitor Skin', 'Emergency Ground'],
            utility: ['Swift Strikes', 'Discharge Timing']
        },
        keystones: {
            offense: { name: 'Live Wire', description: 'Attack and critically strike faster, but take additional damage.', effects: { attackSpeed: 15, criticalChance: 6, damageTakenReduction: -0.08 } },
            defense: { name: 'Capacitor Overflow', description: 'Greatly increase Energy Shield while reducing maximum health.', effects: { energyShieldPercent: 30, healthPercent: -12 } },
            utility: { name: 'Closed Critical Circuit', description: 'Deal more damage to debuffed targets and gain critical damage.', effects: { damageVsDebuffed: 0.2, criticalMultiplier: 0.25 } }
        },
        outerKeystones: [
            { name: 'Velocity Tax', description: 'Attack speed and combo cadence surge while each hit loses direct force.', effects: { attackSpeed: 18, comboAttack: 18, directDamageMultiplier: -0.13 } },
            { name: 'Perfect Ground', description: 'Energy Shield and elemental resistance become exceptional, but health recovery stalls.', effects: { energyShieldPercent: 28, defenseTypes: { elementalResistance: 15 }, healthRegen: -2 } }
        ],
        specialists: ['Overclock Array', 'Capacitor Anatomy', 'Discharge Loop']
    },
    cryo: {
        label: 'Cryo', angle: -90 + (360 / 7) * 5, damageType: 'cryo', group: 'elemental', resistance: 'elementalResistance',
        identity: 'Control, impaired-target damage, deflection, and Energy Shield.',
        laneNames: {
            offense: ['Thermal Theft', 'Brittle Fracture'],
            defense: ['Frozen Bulwark', 'Glacial Deflection'],
            utility: ['Frigid Timing', 'Heat Sink Logic']
        },
        keystones: {
            offense: { name: 'Shatter Doctrine', description: 'Deal much more damage to debuffed enemies, but less to clean targets.', effects: { damageVsDebuffed: 0.25, directDamageMultiplier: -0.05 } },
            defense: { name: 'Absolute Bulwark', description: 'Greatly increase Energy Shield at the cost of maximum health.', effects: { energyShieldPercent: 25, healthPercent: -10 } },
            utility: { name: 'Absolute Zero', description: 'Statuses persist longer, but your attack speed is reduced.', effects: { debuffDurationBonus: 0.5, attackSpeed: -10 } }
        },
        outerKeystones: [
            { name: 'Stillness Pays', description: 'Control and deflection intensify while rapid attacks become impossible.', effects: { damageVsDebuffed: 0.18, deflection: 16, attackSpeed: -12 } },
            { name: 'Permafrost Shell', description: 'A vast Energy Shield replaces much of your regenerative biology.', effects: { energyShieldPercent: 35, defenseTypes: { elementalResistance: 10 }, healthRegen: -3 } }
        ],
        specialists: ['Fracture Mechanics', 'Glacial Bastion', 'Thermal Arrest']
    },
    pyro: {
        label: 'Pyro', angle: -90 + (360 / 7) * 6, damageType: 'pyro', group: 'elemental', resistance: 'elementalResistance',
        identity: 'Burst damage, burning, resistance stripping, and regeneration.',
        laneNames: {
            offense: ['Pyro Mastery', 'Combustion Window'],
            defense: ['Furnace Blood', 'Cauterized Tissue'],
            utility: ['Scorch Pattern', 'Ignition Control']
        },
        keystones: {
            offense: { name: 'Flashover', description: 'Increase both direct and burning damage while becoming more vulnerable.', effects: { directDamageMultiplier: 0.18, dotDamageMultiplier: 0.2, damageTakenReduction: -0.08 } },
            defense: { name: 'Furnace Heart', description: 'Gain health and regeneration while sacrificing Energy Shield.', effects: { healthPercent: 12, healthRegen: 4, energyShieldPercent: -20 } },
            utility: { name: 'Cauterizing Assault', description: 'Apply longer-lasting statuses more often, but lose Deflection.', effects: { debuffChanceBonus: 0.05, debuffDurationBonus: 0.3, deflection: -8 } }
        },
        outerKeystones: [
            { name: 'Fuel the Furnace', description: 'Convert personal safety into overwhelming direct and burning output.', effects: { directDamageMultiplier: 0.16, dotDamageMultiplier: 0.22, healthPercent: -12 } },
            { name: 'Ashen Rebirth', description: 'Health and regeneration flourish in the heat while Energy Shield collapses.', effects: { healthPercent: 16, healthRegen: 5, energyShieldPercent: -30 } }
        ],
        specialists: ['Combustion Chamber', 'Furnace Physiology', 'Scorch Cascade']
    }
});

const PASSIVE_BRIDGE_DEFINITIONS = Object.freeze([
    { sectors: ['kinetic', 'slashing'], label: 'Physical Confluence', notable: 'Physical Mastery', effects: { damageGroups: { physical: 5 }, flatHealth: 14 } },
    { sectors: ['slashing', 'corrosive'], label: 'Open-Wound Chemistry', notable: 'Septic Edge', effects: { damageTypes: { slashing: 4, corrosive: 4 }, dotDamageMultiplier: 0.03 } },
    { sectors: ['corrosive', 'radiation'], label: 'Chemical Confluence', notable: 'Chemical Mastery', effects: { damageGroups: { chemical: 5 }, defenseTypes: { chemicalResistance: 3 } } },
    { sectors: ['radiation', 'electric'], label: 'Volatile Circuitry', notable: 'Irradiated Conductor', effects: { damageTypes: { radiation: 4, electric: 4 }, bionicSync: 3 } },
    { sectors: ['electric', 'cryo'], label: 'Superconductive Shell', notable: 'Zero-Resistance Circuit', effects: { damageTypes: { electric: 4, cryo: 4 }, flatEnergyShield: 14 } },
    { sectors: ['cryo', 'pyro'], label: 'Thermal Confluence', notable: 'Thermal Mastery', effects: { damageTypes: { cryo: 4, pyro: 4 }, defenseTypes: { elementalResistance: 3 } } },
    { sectors: ['pyro', 'kinetic'], label: 'Explosive Impact', notable: 'Detonation Physics', effects: { damageTypes: { pyro: 4, kinetic: 4 }, debuffChanceBonus: 0.012 } }
]);

const PASSIVE_GENERIC_BLUEPRINTS = Object.freeze([
    { label: 'Vital Frame', focus: 'health', category: 'generic' },
    { label: 'Barrier Weave', focus: 'shield', category: 'generic' },
    { label: 'Sector Method', focus: 'identity', category: 'generic' }
]);
const PASSIVE_WEAPON_FAMILY_ORDER = Object.freeze([
    'blades', 'impact', 'sidearms', 'rifles', 'projectors', 'ordnance', 'conduits'
]);
const PASSIVE_WEAPON_FAMILY_DEFINITIONS = Object.freeze({
    blades: { label: 'Blades', identity: 'critical timing, combo pressure, and precise wounds' },
    impact: { label: 'Impact', identity: 'reliable damage rolls, penetration, and crushing force' },
    sidearms: { label: 'Sidearms', identity: 'fast attacks, precision, and opportunistic combos' },
    rifles: { label: 'Rifles', identity: 'precision, critical damage, and deliberate execution' },
    projectors: { label: 'Projectors', identity: 'status application, duration, and persistent harm' },
    ordnance: { label: 'Ordnance', identity: 'oversized direct hits, penetration, and mechanism efficiency' },
    conduits: { label: 'Conduits', identity: 'synthetic integration, status control, and adaptive output' }
});
const PASSIVE_WEAPON_TAG_ORDER = Object.freeze(['melee', 'ranged', 'oneHanded', 'twoHanded']);
const PASSIVE_WEAPON_TAG_DEFINITIONS = Object.freeze({
    melee: { label: 'Melee', identity: 'close-range force and defensive commitment' },
    ranged: { label: 'Ranged', identity: 'precision and controlled damage rolls' },
    oneHanded: { label: 'One-Handed', identity: 'speed, flexibility, and combo cadence' },
    twoHanded: { label: 'Two-Handed', identity: 'deliberate force and efficient mechanisms' }
});
const PASSIVE_COMBAT_STYLE_ORDER = Object.freeze(['balancedStyle', 'heavyStyle', 'twinStyle', 'counterStyle']);
const PASSIVE_COMBAT_STYLE_DEFINITIONS = Object.freeze({
    balancedStyle: { label: 'Balanced Style', identity: 'clean timing, precision, and reliable damage' },
    heavyStyle: { label: 'Heavy Style', identity: 'committed force, resistance, and concentrated hits' },
    twinStyle: { label: 'Twin Style', identity: 'multi-hit tempo, combos, and status opportunities' },
    counterStyle: { label: 'Counter Style', identity: 'deflection, mitigation, and retaliatory control' }
});
const PASSIVE_CLUSTER_SLOT_SEQUENCE = Object.freeze([
    'generic', 'family', 'tag', 'style', 'family', 'generic',
    'family', 'tag', 'style', 'family', 'tag', 'family',
    'style', 'family', 'tag', 'family', 'style', 'generic'
]);

// Irregular arterial anchors. Clusters are hung beside these roads instead of
// being inserted into them, so travel can pass by a specialization.
const PASSIVE_ARTERY_LAYOUT = Object.freeze([
    { radius: 540, angle: -13, side: -1 }, { radius: 690, angle: 1, side: 1 }, { radius: 560, angle: 14, side: 1 },
    { radius: 1030, angle: -18, side: -1 }, { radius: 1190, angle: -5, side: 1 }, { radius: 1050, angle: 11, side: -1 },
    { radius: 1510, angle: -12, side: 1 }, { radius: 1690, angle: 4, side: -1 }, { radius: 1480, angle: 18, side: 1 },
    { radius: 2050, angle: -19, side: -1 }, { radius: 2220, angle: -3, side: 1 }, { radius: 2030, angle: 14, side: -1 },
    { radius: 2580, angle: -13, side: 1 }, { radius: 2780, angle: 4, side: -1 }, { radius: 2540, angle: 19, side: 1 },
    { radius: 3150, angle: -18, side: -1 }, { radius: 3340, angle: -1, side: 1 }, { radius: 3130, angle: 16, side: -1 }
]);
const PASSIVE_CLUSTER_RADII = Object.freeze([
    770, 930, 780,
    1270, 1430, 1290,
    1750, 1950, 1740,
    2290, 2460, 2290,
    2820, 3020, 2800,
    3380, 3590, 3380
]);
const PASSIVE_MAX_LOCAL_EDGE_LENGTH = 620;
const PASSIVE_TWO_EXIT_CLUSTERS = new Set([4, 7, 10, 13]);
const PASSIVE_SPECIALIST_LAYOUT = Object.freeze([
    { radius: 3860, angle: -17 }, { radius: 4210, angle: 1 }, { radius: 3910, angle: 17 }
]);

const PASSIVE_KEYSTONE_CLUSTER_INDEXES = Object.freeze([0, 5]);
const PASSIVE_SECOND_NOTABLE_INDEXES = new Set([1, 3, 5, 7, 9, 11, 13, 15, 17]);

function passivePolarPosition(radius, degrees) {
    const radians = degrees * Math.PI / 180;
    return { x: Math.round(Math.cos(radians) * radius), y: Math.round(Math.sin(radians) * radius) };
}

function offsetPassivePosition(position, distance, degrees) {
    const offset = passivePolarPosition(distance, degrees);
    return { x: position.x + offset.x, y: position.y + offset.y };
}

function mergePassiveEffects(...sources) {
    const result = {};
    const mergeInto = (target, source) => {
        for (const [key, value] of Object.entries(source || {})) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
                mergeInto(target[key], value);
            } else {
                target[key] = Number(target[key] || 0) + Number(value || 0);
            }
        }
    };
    for (const source of sources) {
        mergeInto(result, source);
    }
    return result;
}

function getSectorIdentityEffects(sector, variant = 0) {
    const effects = {
        kinetic: [
            { damageRollFloorBonus: 0.012, weaponEfficiency: 1.5 },
            { flatHealth: 10, defenseTypes: { physicalResistance: 1 } },
            { debuffChanceBonus: 0.004, precision: 1 }
        ],
        slashing: [
            { criticalMultiplier: 0.025, severedLimbChance: 0.5 },
            { deflection: 1.5, comboAttack: 1 },
            { dotDamageMultiplier: 0.012, maxSeepingWoundStacks: 0.2 }
        ],
        corrosive: [
            { dotDamageMultiplier: 0.016, debuffDurationBonus: 0.025 },
            { healthRegen: 0.18, defenseTypes: { chemicalResistance: 1 } },
            { debuffChanceBonus: 0.005, damageVsDebuffed: 0.01 }
        ],
        radiation: [
            { dotDamageMultiplier: 0.016, bionicSync: 1 },
            { flatEnergyShield: 7, defenseTypes: { chemicalResistance: 1 } },
            { debuffChanceBonus: 0.005, bionicEfficiency: 1 }
        ],
        electric: [
            { attackSpeed: 1.2, precision: 1 },
            { flatEnergyShield: 8, criticalChance: 0.7 },
            { comboAttack: 1.2, criticalMultiplier: 0.018 }
        ],
        cryo: [
            { damageVsDebuffed: 0.012, debuffDurationBonus: 0.025 },
            { flatEnergyShield: 8, deflection: 1 },
            { debuffChanceBonus: 0.004, defenseTypes: { elementalResistance: 1 } }
        ],
        pyro: [
            { directDamageMultiplier: 0.012, debuffChanceBonus: 0.004 },
            { healthRegen: 0.18, flatHealth: 8 },
            { dotDamageMultiplier: 0.014, debuffDurationBonus: 0.02 }
        ]
    };
    return effects[sector.damageType]?.[variant % 3] || { damageTypes: { [sector.damageType]: 2 } };
}

function getSectorEfficiencyEffects(sector) {
    const bySector = {
        kinetic: { weaponEfficiency: 1.5, armorEfficiency: 0.5 },
        slashing: { weaponEfficiency: 1.25, comboEffectiveness: 1.5 },
        corrosive: { armorEfficiency: 1, bionicEfficiency: 1 },
        radiation: { bionicEfficiency: 1.5, bionicSync: 1 },
        electric: { weaponEfficiency: 1, bionicEfficiency: 1 },
        cryo: { armorEfficiency: 1.5, deflection: 1 },
        pyro: { weaponEfficiency: 1.25, armorEfficiency: 0.75 }
    };
    return bySector[sector.damageType];
}

function scaleWhole(value, scale, minimum = 1) {
    return Math.max(minimum, Math.round(value * scale));
}

function scaleDecimal(value, scale, digits = 3) {
    return Number((value * scale).toFixed(digits));
}

function getSectorClusterBlueprints(sectorIndex) {
    let familyIndex = 0;
    let tagIndex = 0;
    let styleIndex = 0;
    let genericIndex = 0;
    return PASSIVE_CLUSTER_SLOT_SEQUENCE.map(category => {
        if (category === 'family') {
            const target = PASSIVE_WEAPON_FAMILY_ORDER[(familyIndex++ + sectorIndex * 2) % PASSIVE_WEAPON_FAMILY_ORDER.length];
            const definition = PASSIVE_WEAPON_FAMILY_DEFINITIONS[target];
            return { category, target, focus: 'weaponFamily', label: `${definition.label} Method`, identity: definition.identity };
        }
        if (category === 'tag') {
            const target = PASSIVE_WEAPON_TAG_ORDER[(tagIndex++ + sectorIndex) % PASSIVE_WEAPON_TAG_ORDER.length];
            const definition = PASSIVE_WEAPON_TAG_DEFINITIONS[target];
            return { category, target, focus: 'weaponTag', label: `${definition.label} Method`, identity: definition.identity };
        }
        if (category === 'style') {
            const target = PASSIVE_COMBAT_STYLE_ORDER[(styleIndex++ + sectorIndex) % PASSIVE_COMBAT_STYLE_ORDER.length];
            const definition = PASSIVE_COMBAT_STYLE_DEFINITIONS[target];
            return { category, target, focus: 'combatStyle', label: `${definition.label} Method`, identity: definition.identity };
        }
        return PASSIVE_GENERIC_BLUEPRINTS[genericIndex++ % PASSIVE_GENERIC_BLUEPRINTS.length];
    });
}

function wrapConditionalPassiveEffects(category, target, effects) {
    const key = category === 'family'
        ? 'weaponFamilyBonuses'
        : category === 'tag'
            ? 'weaponTagBonuses'
            : 'combatStyleBonuses';
    return { [key]: { [target]: effects } };
}

function getWeaponFamilyMinorEffects(sector, family, nodeIndex, scale) {
    const variants = {
        blades: [
            { criticalChance: scaleDecimal(0.7, scale, 2), criticalMultiplier: scaleDecimal(0.012, scale) },
            { comboAttack: scaleDecimal(1.2, scale, 2), precision: scaleWhole(1, scale) },
            { directDamageMultiplier: scaleDecimal(0.009, scale), damageTypes: { [sector.damageType]: scaleWhole(1, scale) } }
        ],
        impact: [
            { damageRollFloorBonus: scaleDecimal(0.009, scale), weaponEfficiency: scaleDecimal(1.2, scale, 2) },
            { armorPenetration: scaleWhole(1, scale), directDamageMultiplier: scaleDecimal(0.008, scale) },
            { damageTypes: { [sector.damageType]: scaleWhole(2, scale) }, precision: scaleWhole(1, scale) }
        ],
        sidearms: [
            { attackSpeed: scaleDecimal(1.1, scale, 2), precision: scaleWhole(1, scale) },
            { comboAttack: scaleDecimal(1.2, scale, 2), criticalChance: scaleDecimal(0.5, scale, 2) },
            { damageRollFloorBonus: scaleDecimal(0.007, scale), damageTypes: { [sector.damageType]: scaleWhole(1, scale) } }
        ],
        rifles: [
            { precision: scaleWhole(2, scale), criticalMultiplier: scaleDecimal(0.014, scale) },
            { damageRollFloorBonus: scaleDecimal(0.009, scale), criticalChance: scaleDecimal(0.5, scale, 2) },
            { directDamageMultiplier: scaleDecimal(0.009, scale), damageTypes: { [sector.damageType]: scaleWhole(1, scale) } }
        ],
        projectors: [
            { debuffChanceBonus: scaleDecimal(0.004, scale), debuffDurationBonus: scaleDecimal(0.018, scale) },
            { dotDamageMultiplier: scaleDecimal(0.012, scale), weaponEfficiency: scaleDecimal(1, scale, 2) },
            { damageVsDebuffed: scaleDecimal(0.009, scale), damageTypes: { [sector.damageType]: scaleWhole(1, scale) } }
        ],
        ordnance: [
            { directDamageMultiplier: scaleDecimal(0.012, scale), armorPenetration: scaleWhole(1, scale) },
            { weaponEfficiency: scaleDecimal(1.5, scale, 2), damageRollFloorBonus: scaleDecimal(0.008, scale) },
            { damageTypes: { [sector.damageType]: scaleWhole(2, scale) }, criticalMultiplier: scaleDecimal(0.012, scale) }
        ],
        conduits: [
            { bionicSync: scaleDecimal(1, scale, 2), weaponEfficiency: scaleDecimal(1, scale, 2) },
            { debuffChanceBonus: scaleDecimal(0.0035, scale), precision: scaleWhole(1, scale) },
            { damageTypes: { [sector.damageType]: scaleWhole(2, scale) }, flatEnergyShield: scaleWhole(4, scale) }
        ]
    };
    return wrapConditionalPassiveEffects('family', family, variants[family][nodeIndex % 3]);
}

function getWeaponTagMinorEffects(sector, tag, nodeIndex, scale) {
    const variants = {
        melee: [
            { directDamageMultiplier: scaleDecimal(0.008, scale), deflection: scaleWhole(1, scale) },
            { damageTypes: { [sector.damageType]: scaleWhole(1, scale) }, flatHealth: scaleWhole(5, scale) },
            { weaponEfficiency: scaleDecimal(1, scale, 2), armorPenetration: scaleWhole(1, scale) }
        ],
        ranged: [
            { precision: scaleWhole(2, scale), damageRollFloorBonus: scaleDecimal(0.006, scale) },
            { criticalChance: scaleDecimal(0.5, scale, 2), damageTypes: { [sector.damageType]: scaleWhole(1, scale) } },
            { weaponEfficiency: scaleDecimal(1, scale, 2), criticalMultiplier: scaleDecimal(0.01, scale) }
        ],
        oneHanded: [
            { attackSpeed: scaleDecimal(1, scale, 2), comboAttack: scaleDecimal(1, scale, 2) },
            { precision: scaleWhole(1, scale), criticalChance: scaleDecimal(0.5, scale, 2) },
            { damageTypes: { [sector.damageType]: scaleWhole(1, scale) }, deflection: scaleWhole(1, scale) }
        ],
        twoHanded: [
            { directDamageMultiplier: scaleDecimal(0.01, scale), weaponEfficiency: scaleDecimal(1.2, scale, 2) },
            { armorPenetration: scaleWhole(1, scale), damageRollFloorBonus: scaleDecimal(0.007, scale) },
            { damageTypes: { [sector.damageType]: scaleWhole(2, scale) }, criticalMultiplier: scaleDecimal(0.01, scale) }
        ]
    };
    return wrapConditionalPassiveEffects('tag', tag, variants[tag][nodeIndex % 3]);
}

function getCombatStyleMinorEffects(sector, style, nodeIndex, scale) {
    const variants = {
        balancedStyle: [
            { attackTimeModifier: scaleDecimal(-0.008, scale), precision: scaleWhole(1, scale) },
            { damageRollFloorBonus: scaleDecimal(0.007, scale), damageTypes: { [sector.damageType]: scaleWhole(1, scale) } },
            { criticalChance: scaleDecimal(0.5, scale, 2), deflection: scaleWhole(1, scale) }
        ],
        heavyStyle: [
            { defenseTypes: { [sector.resistance]: scaleWhole(1, scale) }, flatHealth: scaleWhole(5, scale) },
            { directDamageMultiplier: scaleDecimal(0.01, scale), armorPenetration: scaleWhole(1, scale) },
            { damageRollFloorBonus: scaleDecimal(0.008, scale), damageTypes: { [sector.damageType]: scaleWhole(1, scale) } }
        ],
        twinStyle: [
            { comboAttack: scaleDecimal(1.2, scale, 2), attackSpeed: scaleDecimal(0.8, scale, 2) },
            { debuffChanceBonus: scaleDecimal(0.0035, scale), damageTypes: { [sector.damageType]: scaleWhole(1, scale) } },
            { criticalChance: scaleDecimal(0.6, scale, 2), comboEffectiveness: scaleDecimal(1, scale, 2) }
        ],
        counterStyle: [
            { damageTakenReduction: scaleDecimal(0.003, scale, 4), deflection: scaleWhole(1, scale) },
            { flatEnergyShield: scaleWhole(6, scale), defenseTypes: { [sector.resistance]: scaleWhole(1, scale) } },
            { damageTypes: { [sector.damageType]: scaleWhole(1, scale) }, damageRollFloorBonus: scaleDecimal(0.006, scale) }
        ]
    };
    return wrapConditionalPassiveEffects('style', style, variants[style][nodeIndex % 3]);
}

function getClusterMinorEffects(sector, blueprint, depth, nodeIndex) {
    const scale = 1 + Math.floor(depth / 6) * 0.15 + (nodeIndex % 4 === 3 ? 0.08 : 0);
    if (blueprint.category === 'family') return getWeaponFamilyMinorEffects(sector, blueprint.target, nodeIndex, scale);
    if (blueprint.category === 'tag') return getWeaponTagMinorEffects(sector, blueprint.target, nodeIndex, scale);
    if (blueprint.category === 'style') return getCombatStyleMinorEffects(sector, blueprint.target, nodeIndex, scale);
    switch (blueprint.focus) {
        case 'damage': return { damageTypes: { [sector.damageType]: scaleWhole(3, scale) } };
        case 'health': return nodeIndex % 3 === 0
            ? { healthPercent: scaleWhole(1, scale), flatHealth: scaleWhole(8, scale) }
            : { flatHealth: scaleWhole(13, scale), defenseTypes: { [sector.resistance]: scaleWhole(1, scale) } };
        case 'precision': return { precision: scaleWhole(2, scale), damageTypes: { [sector.damageType]: scaleWhole(2, scale) } };
        case 'guard': return { defenseTypes: { [sector.resistance]: scaleWhole(2, scale) }, deflection: scaleWhole(1, scale), flatHealth: scaleWhole(6, scale) };
        case 'identity': return getSectorIdentityEffects(sector, nodeIndex);
        case 'shield': return nodeIndex % 3 === 0
            ? { energyShieldPercent: scaleWhole(1, scale), flatEnergyShield: scaleWhole(6, scale) }
            : { flatEnergyShield: scaleWhole(11, scale), defenseTypes: { [sector.resistance]: scaleWhole(1, scale) } };
        case 'critical': return { criticalChance: scaleWhole(1, scale), criticalMultiplier: scaleDecimal(0.02, scale) };
        case 'sustain': return { healthRegen: scaleDecimal(0.18, scale, 2), flatHealth: scaleWhole(8, scale), flatEnergyShield: scaleWhole(4, scale) };
        case 'efficiency': return getSectorEfficiencyEffects(sector);
        case 'group': return { damageGroups: { [sector.group]: scaleWhole(3, scale) }, defenseTypes: { [sector.resistance]: scaleWhole(1, scale) } };
        case 'control': return { debuffChanceBonus: scaleDecimal(0.004, scale), debuffDurationBonus: scaleDecimal(0.022, scale) };
        case 'dot': return { dotDamageMultiplier: scaleDecimal(0.014, scale), damageTypes: { [sector.damageType]: scaleWhole(2, scale) } };
        case 'armor': return { armorEfficiency: scaleDecimal(1.2, scale, 2), defenseTypes: { [sector.resistance]: scaleWhole(1, scale) }, flatHealth: scaleWhole(5, scale) };
        case 'tempo': return { attackSpeed: scaleDecimal(1.1, scale, 2), comboAttack: scaleDecimal(1, scale, 2) };
        case 'bionic': return { bionicSync: scaleDecimal(1.2, scale, 2), bionicEfficiency: scaleDecimal(1, scale, 2), flatEnergyShield: scaleWhole(4, scale) };
        case 'execution': return { directDamageMultiplier: scaleDecimal(0.011, scale), damageVsDebuffed: scaleDecimal(0.009, scale) };
        case 'resilience': return { damageTakenReduction: scaleDecimal(0.0035, scale, 4), flatHealth: scaleWhole(7, scale), flatEnergyShield: scaleWhole(5, scale) };
        default: return { damageTypes: { [sector.damageType]: scaleWhole(2, scale) } };
    }
}

function getTravelEffects(sector, depth) {
    const sequence = [
        { damageTypes: { [sector.damageType]: 2 } },
        { flatHealth: 8 },
        { flatEnergyShield: 6 },
        { precision: 1, deflection: 1 },
        { defenseTypes: { [sector.resistance]: 1 } },
        getSectorIdentityEffects(sector, depth)
    ];
    return sequence[depth % sequence.length];
}

function getClusterNotableEffects(sector, blueprint, depth, nodeIndex) {
    const base = getClusterMinorEffects(sector, blueprint, depth, nodeIndex);
    if (blueprint.category === 'family' || blueprint.category === 'tag' || blueprint.category === 'style') {
        return mergePassiveEffects(base, base, base, getSectorIdentityEffects(sector, depth + nodeIndex));
    }
    const focusBonuses = {
        health: { healthPercent: 3 },
        shield: { energyShieldPercent: 4 },
        critical: { criticalChance: 2, criticalMultiplier: 0.05 },
        sustain: { healthRegen: 0.6 },
        group: { damageGroups: { [sector.group]: 4 } },
        control: { debuffChanceBonus: 0.012, debuffDurationBonus: 0.08 },
        dot: { dotDamageMultiplier: 0.04 },
        armor: { armorEfficiency: 3 },
        tempo: { attackSpeed: 3, comboAttack: 3 },
        bionic: { bionicSync: 4, bionicEfficiency: 3 },
        execution: { directDamageMultiplier: 0.035, damageVsDebuffed: 0.03 },
        resilience: { damageTakenReduction: 0.012, healthPercent: 2, energyShieldPercent: 2 }
    };
    return mergePassiveEffects(base, base, focusBonuses[blueprint.focus], getSectorIdentityEffects(sector, depth + nodeIndex));
}

function getLegacyNotableName(sector, clusterIndex) {
    const names = [
        sector.laneNames.offense[0], sector.laneNames.defense[0], sector.laneNames.utility[0],
        sector.laneNames.offense[1], sector.laneNames.defense[1], sector.laneNames.utility[1]
    ];
    return names[clusterIndex] || null;
}

function getLegacyNotableNameForNode(sector, clusterIndex, nodeIndex) {
    const placement = {
        '1:3': 0,
        '2:3': 1,
        '3:3': 2,
        '4:3': 3,
        '5:7': 4,
        '6:3': 5
    }[`${clusterIndex}:${nodeIndex}`];
    return placement === undefined ? null : getLegacyNotableName(sector, placement);
}

function getSectorKeystones(sector) {
    return [sector.keystones.offense, sector.keystones.defense, sector.keystones.utility, ...sector.outerKeystones];
}

function getSpecialistMinorEffects(sector, wheelIndex, nodeIndex) {
    if (wheelIndex === 0) {
        const offense = nodeIndex % 3 === 0
            ? mergePassiveEffects({ damageTypes: { [sector.damageType]: 3 } }, getSectorEfficiencyEffects(sector))
            : { damageTypes: { [sector.damageType]: 3 }, precision: 1 };
        return mergePassiveEffects(offense, nodeIndex % 2 === 0 ? { flatHealth: 5 } : null);
    }
    if (wheelIndex === 1) {
        return nodeIndex % 2 === 0
            ? { flatHealth: 14, defenseTypes: { [sector.resistance]: 2 }, armorEfficiency: 1 }
            : { flatEnergyShield: 11, deflection: 1, energyShieldPercent: 1 };
    }
    return mergePassiveEffects(
        getSectorIdentityEffects(sector, nodeIndex),
        nodeIndex % 2 === 0
            ? { damageVsDebuffed: 0.01, flatEnergyShield: 4 }
            : { directDamageMultiplier: 0.01 }
    );
}

function getBridgeMinorEffects(leftSector, rightSector, index) {
    if (index % 5 === 1) return { flatHealth: 8, flatEnergyShield: 6 };
    if (index % 5 === 3) return { precision: 1, deflection: 1 };
    return { damageTypes: { [leftSector.damageType]: 1, [rightSector.damageType]: 1 } };
}

function createPassiveTree() {
    const nodes = [];
    const links = new Set();
    const clusters = [];
    const nodeIds = new Set();
    const authoredNodeById = new Map();
    const addNode = node => {
        if (nodeIds.has(node.id)) throw new TypeError(`Duplicate passive node ID: ${node.id}`);
        nodeIds.add(node.id);
        const completed = { maxRank: 1, gearScalable: node.type !== 'keystone', ...node };
        nodes.push(completed);
        authoredNodeById.set(completed.id, completed);
    };
    const link = (left, right) => {
        if (!left || !right || left === right) return;
        links.add([left, right].sort().join('|'));
    };
    const connectRing = ids => ids.forEach((id, index) => link(id, ids[(index + 1) % ids.length]));
    const getClosestNodePair = (leftIds, rightIds) => {
        let closest = null;
        for (const leftId of leftIds) {
            const left = authoredNodeById.get(leftId);
            for (const rightId of rightIds) {
                const right = authoredNodeById.get(rightId);
                if (!left || !right) continue;
                const distance = Math.hypot(left.x - right.x, left.y - right.y);
                if (!closest || distance < closest.distance) closest = { leftId, rightId, distance };
            }
        }
        return closest;
    };
    const linkLocalPath = (leftId, rightId, options) => {
        const left = authoredNodeById.get(leftId);
        const right = authoredNodeById.get(rightId);
        if (!left || !right) throw new TypeError(`Cannot build local passive path: ${leftId} -> ${rightId}`);
        const routeIds = [leftId];
        for (const [waypointIndex, waypoint] of (options.waypoints || []).entries()) {
            const waypointId = `${options.idPrefix}-bend-${waypointIndex + 1}`;
            addNode({
                id: waypointId,
                name: `${options.label} Connector`,
                description: options.description || 'A short local connection between nearby passive routes.',
                sector: options.sectorId,
                type: 'connector',
                depth: options.depth,
                x: Math.round(waypoint.x),
                y: Math.round(waypoint.y),
                effects: options.effects || { precision: 1 }
            });
            routeIds.push(waypointId);
        }
        routeIds.push(rightId);
        for (let legIndex = 0; legIndex < routeIds.length - 1; legIndex++) {
            const legLeftId = routeIds[legIndex];
            const legRightId = routeIds[legIndex + 1];
            const legLeft = authoredNodeById.get(legLeftId);
            const legRight = authoredNodeById.get(legRightId);
            const distance = Math.hypot(legLeft.x - legRight.x, legLeft.y - legRight.y);
            const segmentCount = Math.max(1, Math.ceil(distance / PASSIVE_MAX_LOCAL_EDGE_LENGTH));
            let previousId = legLeftId;
            for (let segmentIndex = 1; segmentIndex < segmentCount; segmentIndex++) {
                const progress = segmentIndex / segmentCount;
                const connectorId = `${options.idPrefix}-leg-${legIndex + 1}-connector-${segmentIndex}`;
                addNode({
                    id: connectorId,
                    name: `${options.label} Connector`,
                    description: options.description || 'A short local connection between nearby passive routes.',
                    sector: options.sectorId,
                    type: 'connector',
                    depth: options.depth,
                    x: Math.round(legLeft.x + (legRight.x - legLeft.x) * progress),
                    y: Math.round(legLeft.y + (legRight.y - legLeft.y) * progress),
                    effects: options.effects || { precision: 1 }
                });
                link(previousId, connectorId);
                previousId = connectorId;
            }
            link(previousId, legRightId);
        }
    };
    const getPointToSegmentDistance = (point, left, right) => {
        const deltaX = right.x - left.x;
        const deltaY = right.y - left.y;
        const lengthSquared = deltaX * deltaX + deltaY * deltaY;
        if (lengthSquared <= Number.EPSILON) return Math.hypot(point.x - left.x, point.y - left.y);
        const progress = Math.max(0, Math.min(1,
            ((point.x - left.x) * deltaX + (point.y - left.y) * deltaY) / lengthSquared
        ));
        return Math.hypot(
            point.x - (left.x + deltaX * progress),
            point.y - (left.y + deltaY * progress)
        );
    };
    const isRouteClearOfClusters = (routePoints, ignoredClusterIds = new Set()) => {
        for (let pointIndex = 0; pointIndex < routePoints.length - 1; pointIndex++) {
            const left = routePoints[pointIndex];
            const right = routePoints[pointIndex + 1];
            for (const cluster of clusters) {
                if (ignoredClusterIds.has(cluster.id)) continue;
                if (getPointToSegmentDistance(cluster, left, right) < cluster.radius + 24) return false;
            }
        }
        return true;
    };
    const getClearRouteWaypoints = (leftId, rightId, ignoredClusterIds = []) => {
        const left = authoredNodeById.get(leftId);
        const right = authoredNodeById.get(rightId);
        const ignored = new Set(ignoredClusterIds);
        if (isRouteClearOfClusters([left, right], ignored)) return [];
        const deltaX = right.x - left.x;
        const deltaY = right.y - left.y;
        const length = Math.max(1, Math.hypot(deltaX, deltaY));
        const perpendicularX = -deltaY / length;
        const perpendicularY = deltaX / length;
        const candidates = [];
        for (const progress of [0.35, 0.5, 0.65]) {
            for (const side of [-1, 1]) {
                for (const clearance of [140, 180, 230, 290, 360, 440]) {
                    const waypoint = {
                        x: left.x + deltaX * progress + perpendicularX * side * clearance,
                        y: left.y + deltaY * progress + perpendicularY * side * clearance
                    };
                    const route = [left, waypoint, right];
                    if (!isRouteClearOfClusters(route, ignored)) continue;
                    const routeLength = Math.hypot(left.x - waypoint.x, left.y - waypoint.y)
                        + Math.hypot(right.x - waypoint.x, right.y - waypoint.y);
                    candidates.push({ routeLength, waypoints: [waypoint] });
                }
            }
        }
        if (candidates.length > 0) {
            candidates.sort((a, b) => a.routeLength - b.routeLength);
            return candidates[0].waypoints;
        }
        for (const side of [-1, 1]) {
            for (const clearance of [180, 240, 320, 420, 540]) {
                const waypoints = [0.3, 0.7].map(progress => ({
                    x: left.x + deltaX * progress + perpendicularX * side * clearance,
                    y: left.y + deltaY * progress + perpendicularY * side * clearance
                }));
                if (isRouteClearOfClusters([left, ...waypoints, right], ignored)) return waypoints;
            }
        }
        return null;
    };

    addNode({
        id: PASSIVE_TREE_ORIGIN_ID,
        name: 'Corebound Origin',
        description: 'Every build begins here. The origin is always active and costs no point.',
        sector: 'core', type: 'origin', x: 0, y: 0, effects: {}
    });

    const gatewayIds = {};
    PASSIVE_TREE_SECTOR_ORDER.forEach((sectorId, index) => {
        const sector = PASSIVE_SECTOR_DEFINITIONS[sectorId];
        const gatewayId = `core-${sectorId}-gateway`;
        const junctionId = `core-${sectorId}-junction`;
        gatewayIds[sectorId] = gatewayId;
        addNode({
            id: gatewayId,
            name: `${sector.label} Gateway`,
            description: `Enter the ${sector.label} sector: ${sector.identity}`,
            sector: sectorId, type: 'gateway', ...passivePolarPosition(150, sector.angle),
            effects: { damageTypes: { [sector.damageType]: 3 } }
        });
        addNode({
            id: junctionId,
            name: index % 2 === 0 ? 'Core Vitality' : 'Core Barrier',
            description: 'A defensive central junction supporting hybrid routes into neighboring sectors.',
            sector: 'core', type: 'minor', ...passivePolarPosition(155, sector.angle + (360 / 14)),
            effects: index % 2 === 0 ? { flatHealth: 10, healthPercent: 1 } : { flatEnergyShield: 8, energyShieldPercent: 1 }
        });
        link(PASSIVE_TREE_ORIGIN_ID, gatewayId);
        link(gatewayId, junctionId);
        link(junctionId, `core-${PASSIVE_TREE_SECTOR_ORDER[(index + 1) % PASSIVE_TREE_SECTOR_ORDER.length]}-gateway`);
    });

    const sectorClusterIds = {};
    PASSIVE_TREE_SECTOR_ORDER.forEach((sectorId, sectorIndex) => {
        const sector = PASSIVE_SECTOR_DEFINITIONS[sectorId];
        const blueprints = getSectorClusterBlueprints(sectorIndex);
        const travelIds = [];
        const ringGroups = [];
        const specialistGroups = [];
        sectorClusterIds[sectorId] = { travelIds, ringGroups, specialistGroups };

        PASSIVE_ARTERY_LAYOUT.forEach((layout, clusterIndex) => {
            const depth = clusterIndex + 1;
            const radialWobble = ((sectorIndex * 37 + clusterIndex * 53) % 91) - 45;
            const angularWobble = Math.sin((sectorIndex + 2) * (clusterIndex + 3)) * 1.65;
            const travelAngle = sector.angle + layout.angle + angularWobble;
            const travelPosition = passivePolarPosition(layout.radius + radialWobble, travelAngle);
            const travelId = `${sectorId}-travel-${depth}`;
            addNode({
                id: travelId,
                name: `${sector.label} Arterial Conduit`,
                description: `A travel node passing the nearby ${blueprints[clusterIndex].label} cluster.`,
                sector: sectorId, type: 'travel', depth, ...travelPosition,
                effects: getTravelEffects(sector, clusterIndex)
            });
            travelIds.push(travelId);
        });
        blueprints.forEach((blueprint, clusterIndex) => {
            const depth = clusterIndex + 1;
            const layout = PASSIVE_ARTERY_LAYOUT[clusterIndex];
            const roadAngle = sector.angle + layout.angle;
            const clusterRadiusWobble = ((sectorIndex * 29 + clusterIndex * 41) % 61) - 30;
            const center = passivePolarPosition(
                PASSIVE_CLUSTER_RADII[clusterIndex] + clusterRadiusWobble,
                roadAngle + layout.side * 2.5
            );
            const ringIds = [];
            const keystonePosition = PASSIVE_KEYSTONE_CLUSTER_INDEXES.indexOf(clusterIndex);
            const keystone = keystonePosition >= 0 ? getSectorKeystones(sector)[keystonePosition] : null;
            for (let nodeIndex = 0; nodeIndex < 8; nodeIndex++) {
                const nodePosition = offsetPassivePosition(center, 76, roadAngle + layout.side * 28 + nodeIndex * 45);
                const isPrimary = nodeIndex === 3;
                const isSecondary = nodeIndex === 7 && PASSIVE_SECOND_NOTABLE_INDEXES.has(clusterIndex);
                const isKeystone = isPrimary && Boolean(keystone);
                const type = isKeystone ? 'keystone' : (isPrimary || isSecondary) ? 'notable' : 'minor';
                const legacyName = (isPrimary || isSecondary)
                    ? getLegacyNotableNameForNode(sector, clusterIndex, nodeIndex)
                    : null;
                const name = isKeystone
                    ? keystone.name
                    : isPrimary
                        ? (legacyName || `${sector.label} ${blueprint.label}`)
                        : isSecondary
                            ? (legacyName || `${sector.label} ${blueprint.label} Protocol`)
                            : `${sector.label} ${blueprint.label}`;
                const effects = isKeystone
                    ? keystone.effects
                    : (isPrimary || isSecondary)
                        ? getClusterNotableEffects(sector, blueprint, clusterIndex, nodeIndex)
                        : getClusterMinorEffects(sector, blueprint, clusterIndex, nodeIndex);
                const id = `${sectorId}-cluster-${depth}-${nodeIndex + 1}`;
                const conditionalDescription = blueprint.identity
                    ? `${blueprint.label} develops ${blueprint.identity} within the ${sector.label} region.`
                    : `${blueprint.label} develops ${sector.identity.toLowerCase()}`;
                addNode({
                    id, name,
                    description: isKeystone
                        ? keystone.description
                        : `${conditionalDescription}${type === 'notable' ? ' This is a major cluster node.' : ''}`,
                    sector: sectorId, cluster: blueprint.label, specialty: blueprint.category,
                    target: blueprint.target || null, type, depth, ...nodePosition, effects
                });
                ringIds.push(id);
            }
            connectRing(ringIds);
            const entrance = getClosestNodePair([travelIds[clusterIndex]], ringIds);
            linkLocalPath(entrance.leftId, entrance.rightId, {
                idPrefix: `${sectorId}-cluster-${depth}-entrance`,
                label: `${sector.label} ${blueprint.label}`, sectorId, depth,
                effects: getTravelEffects(sector, clusterIndex)
            });
            if (PASSIVE_TWO_EXIT_CLUSTERS.has(clusterIndex)) {
                const exitTravelId = travelIds[clusterIndex + 3];
                const exit = getClosestNodePair(ringIds, [exitTravelId]);
                linkLocalPath(exit.leftId, exit.rightId, {
                    idPrefix: `${sectorId}-cluster-${depth}-exit`,
                    label: `${sector.label} ${blueprint.label}`, sectorId, depth: depth + 0.5,
                    effects: getTravelEffects(sector, clusterIndex + 3)
                });
            }
            ringGroups.push(ringIds);
            clusters.push({
                id: `${sectorId}-cluster-${depth}`, sector: sectorId, label: blueprint.label,
                specialty: blueprint.category, target: blueprint.target || null,
                x: center.x, y: center.y, radius: 99
            });
        });
        sector.specialists.forEach((specialistName, wheelIndex) => {
            const specialistLayout = PASSIVE_SPECIALIST_LAYOUT[wheelIndex];
            const wheelAngle = sector.angle + specialistLayout.angle + Math.sin((sectorIndex + 1) * (wheelIndex + 2)) * 1.8;
            const center = passivePolarPosition(specialistLayout.radius + sectorIndex * 13 - wheelIndex * 21, wheelAngle);
            const ringIds = [];
            const keystone = getSectorKeystones(sector)[wheelIndex + 2];
            for (let nodeIndex = 0; nodeIndex < 10; nodeIndex++) {
                const nodePosition = offsetPassivePosition(center, 108, wheelAngle + 180 + nodeIndex * 36);
                const isKeystone = nodeIndex === 3;
                const isNotable = nodeIndex === 8;
                const id = `${sectorId}-specialist-${wheelIndex + 1}-${nodeIndex + 1}`;
                const baseEffects = getSpecialistMinorEffects(sector, wheelIndex, nodeIndex);
                addNode({
                    id,
                    name: isKeystone
                        ? keystone.name
                        : isNotable ? `${specialistName} Doctrine` : specialistName,
                    description: isKeystone
                        ? keystone.description
                        : `${specialistName} is an outer ${sector.label} specialization.${isNotable ? ' This is a major specialist node.' : ''}`,
                    sector: sectorId, cluster: specialistName,
                    type: isKeystone ? 'keystone' : isNotable ? 'notable' : 'minor', depth: 19 + wheelIndex,
                    ...nodePosition,
                    effects: isKeystone
                        ? keystone.effects
                        : isNotable
                            ? mergePassiveEffects(baseEffects, baseEffects, getSectorIdentityEffects(sector, nodeIndex))
                            : baseEffects
                });
                ringIds.push(id);
            }
            connectRing(ringIds);
            const entrance = getClosestNodePair([travelIds[15 + wheelIndex]], ringIds);
            const entranceWaypoints = getClearRouteWaypoints(entrance.leftId, entrance.rightId);
            linkLocalPath(entrance.leftId, entrance.rightId, {
                idPrefix: `${sectorId}-specialist-${wheelIndex + 1}-entrance`,
                label: specialistName, sectorId, depth: 19 + wheelIndex,
                effects: getTravelEffects(sector, 15 + wheelIndex),
                waypoints: entranceWaypoints || []
            });
            specialistGroups.push(ringIds);
            clusters.push({ id: `${sectorId}-specialist-${wheelIndex + 1}`, sector: sectorId, label: specialistName, x: center.x, y: center.y, radius: 137, specialist: true });
        });
    });

    // Build the braided roads only after every cluster is positioned. That
    // lets each short connector route around every wheel in the full tree,
    // including neighboring-sector clusters near the center.
    PASSIVE_TREE_SECTOR_ORDER.forEach(sectorId => {
        const sector = PASSIVE_SECTOR_DEFINITIONS[sectorId];
        const { travelIds } = sectorClusterIds[sectorId];
        [0, 1, 2].forEach(index => {
            const waypoints = getClearRouteWaypoints(gatewayIds[sectorId], travelIds[index]);
            if (waypoints === null) return;
            linkLocalPath(gatewayIds[sectorId], travelIds[index], {
                idPrefix: `${sectorId}-gateway-${index + 1}`,
                label: `${sector.label} Gateway`, sectorId, depth: 0.5,
                effects: getTravelEffects(sector, index), waypoints
            });
        });
        for (let layerIndex = 0; layerIndex < 5; layerIndex++) {
            for (let laneIndex = 0; laneIndex < 3; laneIndex++) {
                const leftIndex = layerIndex * 3 + laneIndex;
                const rightIndex = leftIndex + 3;
                const waypoints = getClearRouteWaypoints(travelIds[leftIndex], travelIds[rightIndex]);
                if (waypoints === null) continue;
                linkLocalPath(travelIds[leftIndex], travelIds[rightIndex], {
                    idPrefix: `${sectorId}-artery-out-${leftIndex + 1}-${rightIndex + 1}`,
                    label: `${sector.label} Arterial`, sectorId, depth: layerIndex + 1.5,
                    effects: getTravelEffects(sector, leftIndex), waypoints
                });
            }
        }
        for (let layerIndex = 0; layerIndex < 6; layerIndex++) {
            for (let laneIndex = 0; laneIndex < 2; laneIndex++) {
                const leftIndex = layerIndex * 3 + laneIndex;
                const rightIndex = leftIndex + 1;
                const waypoints = getClearRouteWaypoints(travelIds[leftIndex], travelIds[rightIndex]);
                if (waypoints === null) continue;
                linkLocalPath(travelIds[leftIndex], travelIds[rightIndex], {
                    idPrefix: `${sectorId}-artery-side-${leftIndex + 1}-${rightIndex + 1}`,
                    label: `${sector.label} Crossroad`, sectorId, depth: layerIndex + 1,
                    effects: getTravelEffects(sector, rightIndex), waypoints
                });
            }
        }
    });

    PASSIVE_BRIDGE_DEFINITIONS.forEach((bridge, bridgeIndex) => {
        const [leftSectorId, rightSectorId] = bridge.sectors;
        const leftSector = PASSIVE_SECTOR_DEFINITIONS[leftSectorId];
        const rightSector = PASSIVE_SECTOR_DEFINITIONS[rightSectorId];
        let startAngle = leftSector.angle + 19;
        let endAngle = rightSector.angle - 19;
        while (endAngle <= startAngle) endAngle += 360;
        const ids = [];
        for (let index = 0; index < 17; index++) {
            const progress = (index + 1) / 18;
            const angle = startAngle + (endAngle - startAngle) * progress + Math.sin(progress * Math.PI * 2) * 1.4;
            const radius = 2870 + Math.sin(progress * Math.PI) * 560 + Math.sin(progress * Math.PI * 3) * 85;
            const position = passivePolarPosition(radius, angle);
            const isNotable = index === 5 || index === 12;
            const effects = isNotable
                ? mergePassiveEffects(bridge.effects, bridge.effects, { precision: 2, deflection: 2 })
                : getBridgeMinorEffects(leftSector, rightSector, index);
            const id = `bridge-${bridgeIndex + 1}-${index + 1}`;
            addNode({
                id,
                name: isNotable ? (index === 5 ? bridge.notable : bridge.label) : `${bridge.label} Conduit`,
                description: `A hybrid route between ${leftSector.label} and ${rightSector.label}.`,
                sector: 'bridge', sectors: bridge.sectors, type: isNotable ? 'notable' : 'bridge',
                depth: index + 1, ...position, effects
            });
            ids.push(id);
            if (index > 0) link(ids[index - 1], id);
        }
        const leftEntry = getClosestNodePair([ids[0]], sectorClusterIds[leftSectorId].travelIds.slice(12));
        const rightEntry = getClosestNodePair([ids[ids.length - 1]], sectorClusterIds[rightSectorId].travelIds.slice(12));
        linkLocalPath(leftEntry.leftId, leftEntry.rightId, {
            idPrefix: `bridge-${bridgeIndex + 1}-${leftSectorId}-entry`,
            label: bridge.label, sectorId: 'bridge', depth: 0,
            effects: getBridgeMinorEffects(leftSector, rightSector, 0)
        });
        linkLocalPath(rightEntry.leftId, rightEntry.rightId, {
            idPrefix: `bridge-${bridgeIndex + 1}-${rightSectorId}-entry`,
            label: bridge.label, sectorId: 'bridge', depth: 18,
            effects: getBridgeMinorEffects(leftSector, rightSector, 16)
        });
    });

    // If two deliberately local routes meet at a generated connector, make
    // that meeting a real junction instead of drawing one line beneath an
    // unrelated node.
    for (const connector of nodes.filter(node => node.type === 'connector')) {
        let closestCrossing = null;
        for (const serialized of links) {
            const [fromId, toId] = serialized.split('|');
            if (fromId === connector.id || toId === connector.id) continue;
            const from = authoredNodeById.get(fromId);
            const to = authoredNodeById.get(toId);
            const deltaX = to.x - from.x;
            const deltaY = to.y - from.y;
            const lengthSquared = deltaX * deltaX + deltaY * deltaY;
            if (lengthSquared <= Number.EPSILON) continue;
            const progress = ((connector.x - from.x) * deltaX + (connector.y - from.y) * deltaY) / lengthSquared;
            if (progress <= 0.08 || progress >= 0.92) continue;
            const distance = getPointToSegmentDistance(connector, from, to);
            if (distance < 22 && (!closestCrossing || distance < closestCrossing.distance)) {
                closestCrossing = { serialized, fromId, toId, distance };
            }
        }
        if (!closestCrossing) continue;
        links.delete(closestCrossing.serialized);
        link(closestCrossing.fromId, connector.id);
        link(connector.id, closestCrossing.toId);
    }

    const adjacency = Object.fromEntries(nodes.map(node => [node.id, []]));
    const edges = [...links].map(serialized => {
        const [from, to] = serialized.split('|');
        adjacency[from].push(to);
        adjacency[to].push(from);
        return Object.freeze({ from, to });
    });
    const completedNodes = nodes.map(node => Object.freeze({ ...node, connections: Object.freeze([...adjacency[node.id]]) }));
    const padding = 220;
    const minX = Math.min(...completedNodes.map(node => node.x)) - padding;
    const maxX = Math.max(...completedNodes.map(node => node.x)) + padding;
    const minY = Math.min(...completedNodes.map(node => node.y)) - padding;
    const maxY = Math.max(...completedNodes.map(node => node.y)) + padding;
    return Object.freeze({
        nodes: Object.freeze(completedNodes),
        edges: Object.freeze(edges),
        clusters: Object.freeze(clusters.map(cluster => Object.freeze(cluster))),
        bounds: Object.freeze({ x: minX, y: minY, width: maxX - minX, height: maxY - minY })
    });
}

const PASSIVE_TREE = createPassiveTree();
const passives = PASSIVE_TREE.nodes;
const PASSIVE_NODE_BY_ID = new Map(passives.map(node => [node.id, node]));
const PASSIVE_NODES_BY_NAME = new Map();
for (const node of passives) {
    if (!PASSIVE_NODES_BY_NAME.has(node.name)) PASSIVE_NODES_BY_NAME.set(node.name, []);
    PASSIVE_NODES_BY_NAME.get(node.name).push(node);
}

function getPassiveNode(idOrName) {
    if (!idOrName) return null;
    return PASSIVE_NODE_BY_ID.get(idOrName) || PASSIVE_NODES_BY_NAME.get(idOrName)?.[0] || null;
}

function normalizePassiveAllocations(allocations) {
    const normalized = {};
    for (const [rawKey, rawRank] of Object.entries(allocations || {})) {
        const node = getPassiveNode(rawKey);
        const rank = Math.max(0, Math.floor(Number(rawRank) || 0));
        if (node && node.id !== PASSIVE_TREE_ORIGIN_ID && rank > 0) normalized[node.id] = Math.min(node.maxRank, rank);
    }
    return normalized;
}

function getActivePassiveNodeIds(allocations) {
    return new Set([PASSIVE_TREE_ORIGIN_ID, ...Object.keys(normalizePassiveAllocations(allocations))]);
}

function canAllocatePassiveNode(allocations, nodeId) {
    const node = getPassiveNode(nodeId);
    if (!node || node.id === PASSIVE_TREE_ORIGIN_ID) return { ok: false, reason: 'The origin is always active.' };
    const normalized = normalizePassiveAllocations(allocations);
    if (normalized[node.id]) return { ok: false, reason: 'This node is already allocated.' };
    const active = getActivePassiveNodeIds(normalized);
    if (!node.connections.some(connection => active.has(connection))) {
        return { ok: false, reason: 'Allocate a connected node first.' };
    }
    return { ok: true, reason: '' };
}

function getReachableAllocatedPassiveIds(allocations, ignoredNodeId = null) {
    const active = getActivePassiveNodeIds(allocations);
    if (ignoredNodeId) active.delete(ignoredNodeId);
    const reached = new Set();
    const queue = [PASSIVE_TREE_ORIGIN_ID];
    let index = 0;
    while (index < queue.length) {
        const current = queue[index++];
        if (reached.has(current) || !active.has(current)) continue;
        reached.add(current);
        for (const next of PASSIVE_NODE_BY_ID.get(current)?.connections || []) {
            if (active.has(next) && !reached.has(next)) queue.push(next);
        }
    }
    return reached;
}

function canRefundPassiveNode(allocations, nodeId) {
    const normalized = normalizePassiveAllocations(allocations);
    if (!normalized[nodeId]) return { ok: false, reason: 'This node has no allocated point.' };
    const remaining = Object.keys(normalized).filter(id => id !== nodeId);
    const reached = getReachableAllocatedPassiveIds(normalized, nodeId);
    const disconnected = remaining.filter(id => !reached.has(id));
    if (disconnected.length > 0) {
        return { ok: false, reason: `Refund connected outer nodes first (${disconnected.length} would be disconnected).`, disconnected };
    }
    return { ok: true, reason: '', disconnected: [] };
}

function createEmptyPassiveBonuses() {
    return {
        attackSpeed: 0,
        damageTypes: {},
        damageGroups: {},
        flatDamageTypes: {},
        defenseTypes: {},
        healthPercent: 0,
        energyShieldPercent: 0,
        criticalChance: 0,
        criticalMultiplier: 0,
        flatHealth: 0,
        flatEnergyShield: 0,
        healthRegen: 0,
        precision: 0,
        deflection: 0,
        armorPenetration: 0,
        armorEfficiency: 0,
        weaponEfficiency: 0,
        bionicEfficiency: 0,
        bionicSync: 0,
        comboAttack: 0,
        comboEffectiveness: 0,
        additionalComboAttacks: 0,
        severedLimbChance: 0,
        maxSeveredLimbs: 0,
        maxSeepingWoundStacks: 0,
        damageRollFloorBonus: 0,
        debuffChanceBonus: 0,
        debuffDurationBonus: 0,
        directDamageMultiplier: 0,
        dotDamageMultiplier: 0,
        damageVsDebuffed: 0,
        damageTakenReduction: 0,
        weaponFamilyBonuses: {},
        weaponTagBonuses: {},
        combatStyleBonuses: {}
    };
}

function accumulatePassiveEffects(target, effects, multiplier = 1) {
    const accumulateInto = (destination, source) => {
        for (const [key, value] of Object.entries(source || {})) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                if (!destination[key] || typeof destination[key] !== 'object' || Array.isArray(destination[key])) destination[key] = {};
                accumulateInto(destination[key], value);
            } else {
                destination[key] = Number(destination[key] || 0) + Number(value || 0) * multiplier;
            }
        }
    };
    accumulateInto(target, effects);
    return target;
}

function validatePassiveTree() {
    const errors = [];
    if (passives.length < 1400 || passives.length > 1800) errors.push(`tree requires 1,400-1,800 nodes; found ${passives.length}`);
    if (PASSIVE_NODE_BY_ID.size !== passives.length) errors.push('passive node IDs must be unique');
    if (passives.some(node => node.type === 'jewel')) errors.push('jewel sockets are not part of this passive tree');
    for (const node of passives) {
        if (!node.name || !node.type || !node.effects) errors.push(`${node.id} is missing required data`);
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) errors.push(`${node.id} has invalid coordinates`);
        if (node.id !== PASSIVE_TREE_ORIGIN_ID && node.connections.length > 6) {
            errors.push(`${node.id} is an unreadable ${node.connections.length}-way junction`);
        }
        for (const connection of node.connections || []) {
            const target = PASSIVE_NODE_BY_ID.get(connection);
            if (!target) errors.push(`${node.id} references missing node ${connection}`);
            else if (!target.connections.includes(node.id)) errors.push(`${node.id} -> ${connection} is not symmetric`);
        }
    }
    for (const edge of PASSIVE_TREE.edges) {
        const from = PASSIVE_NODE_BY_ID.get(edge.from);
        const to = PASSIVE_NODE_BY_ID.get(edge.to);
        const distance = Math.hypot(from.x - to.x, from.y - to.y);
        if (distance > PASSIVE_MAX_LOCAL_EDGE_LENGTH + 1) {
            errors.push(`${edge.from} -> ${edge.to} spans ${Math.round(distance)} units`);
        }
        if (distance < 100) continue;
        const deltaX = to.x - from.x;
        const deltaY = to.y - from.y;
        const lengthSquared = deltaX * deltaX + deltaY * deltaY;
        for (const node of passives) {
            if (node.id === edge.from || node.id === edge.to) continue;
            const progress = ((node.x - from.x) * deltaX + (node.y - from.y) * deltaY) / lengthSquared;
            if (progress <= 0.08 || progress >= 0.92) continue;
            const closestX = from.x + deltaX * progress;
            const closestY = from.y + deltaY * progress;
            if (Math.hypot(node.x - closestX, node.y - closestY) < 20) {
                errors.push(`${edge.from} -> ${edge.to} passes over ${node.id}`);
                break;
            }
        }
    }
    const reachable = new Set([PASSIVE_TREE_ORIGIN_ID]);
    const queue = [PASSIVE_TREE_ORIGIN_ID];
    let queueIndex = 0;
    while (queueIndex < queue.length) {
        const current = queue[queueIndex++];
        for (const next of PASSIVE_NODE_BY_ID.get(current)?.connections || []) {
            if (!reachable.has(next)) { reachable.add(next); queue.push(next); }
        }
    }
    if (reachable.size !== passives.length) errors.push(`${passives.length - reachable.size} nodes are unreachable from the origin`);
    const keystoneCount = passives.filter(node => node.type === 'keystone').length;
    const notableCount = passives.filter(node => node.type === 'notable').length;
    if (keystoneCount < 28 || keystoneCount > 40) errors.push(`tree requires 28-40 keystones; found ${keystoneCount}`);
    if (notableCount < 180 || notableCount > 240) errors.push(`tree requires 180-240 notables; found ${notableCount}`);
    const travelNodes = passives.filter(node => node.type === 'travel');
    for (const node of travelNodes) {
        const roadConnections = node.connections.filter(id => {
            const target = PASSIVE_NODE_BY_ID.get(id);
            return target && ['travel', 'connector', 'gateway', 'bridge'].includes(target.type);
        });
        if (roadConnections.length < 2) errors.push(`${node.id} is a forced rail instead of a pass-by arterial node`);
    }
    for (let clusterIndex = 0; clusterIndex < PASSIVE_TREE.clusters.length; clusterIndex++) {
        const cluster = PASSIVE_TREE.clusters[clusterIndex];
        for (let comparisonIndex = clusterIndex + 1; comparisonIndex < PASSIVE_TREE.clusters.length; comparisonIndex++) {
            const comparison = PASSIVE_TREE.clusters[comparisonIndex];
            const centerDistance = Math.hypot(cluster.x - comparison.x, cluster.y - comparison.y);
            if (centerDistance < cluster.radius + comparison.radius) {
                errors.push(`${cluster.id} overlaps ${comparison.id}`);
            }
        }
    }
    for (const sectorId of PASSIVE_TREE_SECTOR_ORDER) {
        const sectorNodes = passives.filter(node => node.sector === sectorId);
        if (sectorNodes.length < 185) errors.push(`${sectorId} sector is undersized`);
        if (sectorNodes.filter(node => node.type === 'keystone').length !== 5) errors.push(`${sectorId} requires exactly five keystones`);
        const lifeNodes = sectorNodes.filter(node => Number(node.effects.flatHealth || 0) > 0 || Number(node.effects.healthPercent || 0) > 0);
        const shieldNodes = sectorNodes.filter(node => Number(node.effects.flatEnergyShield || 0) > 0 || Number(node.effects.energyShieldPercent || 0) > 0);
        if (lifeNodes.length < 20) errors.push(`${sectorId} does not have enough distributed life access`);
        if (shieldNodes.length < 15) errors.push(`${sectorId} does not have enough distributed Energy Shield access`);
        const familyTargets = new Set(sectorNodes.filter(node => node.specialty === 'family').map(node => node.target));
        const tagTargets = new Set(sectorNodes.filter(node => node.specialty === 'tag').map(node => node.target));
        const styleTargets = new Set(sectorNodes.filter(node => node.specialty === 'style').map(node => node.target));
        if (familyTargets.size !== PASSIVE_WEAPON_FAMILY_ORDER.length) errors.push(`${sectorId} does not expose every weapon family`);
        if (tagTargets.size !== PASSIVE_WEAPON_TAG_ORDER.length) errors.push(`${sectorId} does not expose every broad weapon tag`);
        if (styleTargets.size !== PASSIVE_COMBAT_STYLE_ORDER.length) errors.push(`${sectorId} does not expose every combat style`);
    }
    return {
        valid: errors.length === 0,
        errors,
        nodeCount: passives.length,
        edgeCount: PASSIVE_TREE.edges.length,
        clusterCount: PASSIVE_TREE.clusters.length,
        notableCount,
        keystoneCount
    };
}

window.coreboundPassiveTree = Object.freeze({
    version: PASSIVE_TREE_VERSION,
    originId: PASSIVE_TREE_ORIGIN_ID,
    sectorOrder: PASSIVE_TREE_SECTOR_ORDER,
    sectors: PASSIVE_SECTOR_DEFINITIONS,
    bridges: PASSIVE_BRIDGE_DEFINITIONS,
    nodes: passives,
    edges: PASSIVE_TREE.edges,
    clusters: PASSIVE_TREE.clusters,
    bounds: PASSIVE_TREE.bounds,
    getNode: getPassiveNode,
    normalizeAllocations: normalizePassiveAllocations,
    canAllocate: canAllocatePassiveNode,
    canRefund: canRefundPassiveNode,
    getReachableAllocatedIds: getReachableAllocatedPassiveIds,
    createEmptyBonuses: createEmptyPassiveBonuses,
    accumulateEffects: accumulatePassiveEffects,
    validate: validatePassiveTree
});
