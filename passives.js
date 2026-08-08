// Corebound radial passive tree. The graph and effects are generated from
// cluster blueprints so the renderer, save migration, validation, and stat
// pipeline share one authority without maintaining thousands of hand-wired IDs.

const PASSIVE_TREE_VERSION = 3;
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

const PASSIVE_CLUSTER_BLUEPRINTS = Object.freeze([
    { label: 'Force Calibration', focus: 'damage' },
    { label: 'Vital Frame', focus: 'health' },
    { label: 'Target Analysis', focus: 'precision' },
    { label: 'Reactive Guard', focus: 'guard' },
    { label: 'Signature Method', focus: 'identity' },
    { label: 'Barrier Weave', focus: 'shield' },
    { label: 'Critical Geometry', focus: 'critical' },
    { label: 'Recovery Loop', focus: 'sustain' },
    { label: 'Mechanism Tuning', focus: 'efficiency' },
    { label: 'Unified Theory', focus: 'group' },
    { label: 'Reinforced Core', focus: 'health' },
    { label: 'Status Control', focus: 'control' },
    { label: 'Persistent Harm', focus: 'dot' },
    { label: 'Armored Circuit', focus: 'armor' },
    { label: 'Combat Tempo', focus: 'tempo' },
    { label: 'Synthetic Integration', focus: 'bionic' },
    { label: 'Execution Logic', focus: 'execution' },
    { label: 'Outer Resilience', focus: 'resilience' }
]);

const PASSIVE_KEYSTONE_CLUSTER_INDEXES = Object.freeze([4, 5, 9, 14, 17]);
const PASSIVE_SECOND_NOTABLE_INDEXES = new Set([1, 3, 5, 7, 9, 11, 13, 15, 17]);
const PASSIVE_BRANCH_ANGLE_OFFSETS = Object.freeze([-16, 0, 16]);
const PASSIVE_BRANCH_RADII = Object.freeze([750, 1270, 1800, 2330, 2860, 3390]);
const PASSIVE_BRANCH_DEPTH_WIGGLE = Object.freeze([0, 2.5, -2, 3, -2.5, 0]);

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
    for (const source of sources) {
        for (const [key, value] of Object.entries(source || {})) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                result[key] = result[key] || {};
                for (const [nestedKey, nestedValue] of Object.entries(value)) {
                    result[key][nestedKey] = Number(result[key][nestedKey] || 0) + Number(nestedValue || 0);
                }
            } else {
                result[key] = Number(result[key] || 0) + Number(value || 0);
            }
        }
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

function getClusterMinorEffects(sector, blueprint, depth, nodeIndex) {
    const scale = 1 + Math.floor(depth / 6) * 0.15 + (nodeIndex % 4 === 3 ? 0.08 : 0);
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

function getSectorKeystones(sector) {
    return [sector.keystones.offense, sector.keystones.defense, sector.keystones.utility, ...sector.outerKeystones];
}

function getSpecialistMinorEffects(sector, wheelIndex, nodeIndex) {
    if (wheelIndex === 0) {
        return nodeIndex % 3 === 0
            ? mergePassiveEffects({ damageTypes: { [sector.damageType]: 3 } }, getSectorEfficiencyEffects(sector))
            : { damageTypes: { [sector.damageType]: 3 }, precision: 1 };
    }
    if (wheelIndex === 1) {
        return nodeIndex % 2 === 0
            ? { flatHealth: 14, defenseTypes: { [sector.resistance]: 2 }, armorEfficiency: 1 }
            : { flatEnergyShield: 11, deflection: 1, energyShieldPercent: 1 };
    }
    return mergePassiveEffects(getSectorIdentityEffects(sector, nodeIndex), nodeIndex % 2 === 0
        ? { damageVsDebuffed: 0.01 }
        : { directDamageMultiplier: 0.01 });
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
    const addNode = node => {
        if (nodeIds.has(node.id)) throw new TypeError(`Duplicate passive node ID: ${node.id}`);
        nodeIds.add(node.id);
        nodes.push({ maxRank: 1, gearScalable: node.type !== 'keystone', ...node });
    };
    const link = (left, right) => {
        if (!left || !right || left === right) return;
        links.add([left, right].sort().join('|'));
    };
    const connectRing = ids => ids.forEach((id, index) => link(id, ids[(index + 1) % ids.length]));

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
    for (const sectorId of PASSIVE_TREE_SECTOR_ORDER) {
        const sector = PASSIVE_SECTOR_DEFINITIONS[sectorId];
        const branchClusterIds = [[], [], []];
        sectorClusterIds[sectorId] = branchClusterIds;

        PASSIVE_CLUSTER_BLUEPRINTS.forEach((blueprint, clusterIndex) => {
            const depth = clusterIndex + 1;
            const branchIndex = Math.floor(clusterIndex / 6);
            const branchDepth = clusterIndex % 6;
            const branchAngle = sector.angle
                + PASSIVE_BRANCH_ANGLE_OFFSETS[branchIndex]
                + PASSIVE_BRANCH_DEPTH_WIGGLE[branchDepth];
            const clusterRadius = PASSIVE_BRANCH_RADII[branchDepth];
            const travelPosition = passivePolarPosition(clusterRadius - 180, branchAngle);
            const travelId = `${sectorId}-travel-${depth}`;
            addNode({
                id: travelId,
                name: `${sector.label} Neural Conduit`,
                description: `A compact travel node leading toward ${blueprint.label}.`,
                sector: sectorId, type: 'travel', depth, ...travelPosition,
                effects: getTravelEffects(sector, clusterIndex)
            });
            const previousRing = branchClusterIds[branchIndex][branchDepth - 1];
            link(previousRing ? previousRing[4] : gatewayIds[sectorId], travelId);

            const center = passivePolarPosition(clusterRadius, branchAngle);
            const ringIds = [];
            const keystonePosition = PASSIVE_KEYSTONE_CLUSTER_INDEXES.indexOf(clusterIndex);
            const keystone = keystonePosition >= 0 ? getSectorKeystones(sector)[keystonePosition] : null;
            for (let nodeIndex = 0; nodeIndex < 8; nodeIndex++) {
                const nodePosition = offsetPassivePosition(center, 76, branchAngle + 180 + nodeIndex * 45);
                const isPrimary = nodeIndex === 3;
                const isSecondary = nodeIndex === 7 && PASSIVE_SECOND_NOTABLE_INDEXES.has(clusterIndex);
                const isKeystone = isPrimary && Boolean(keystone);
                const type = isKeystone ? 'keystone' : (isPrimary || isSecondary) ? 'notable' : 'minor';
                const legacyName = isPrimary ? getLegacyNotableName(sector, clusterIndex) : null;
                const name = isKeystone
                    ? keystone.name
                    : isPrimary
                        ? (legacyName || `${sector.label} ${blueprint.label}`)
                        : isSecondary
                            ? `${sector.label} ${blueprint.label} Protocol`
                            : `${sector.label} ${blueprint.label}`;
                const effects = isKeystone
                    ? keystone.effects
                    : (isPrimary || isSecondary)
                        ? getClusterNotableEffects(sector, blueprint, clusterIndex, nodeIndex)
                        : getClusterMinorEffects(sector, blueprint, clusterIndex, nodeIndex);
                const id = `${sectorId}-cluster-${depth}-${nodeIndex + 1}`;
                addNode({
                    id, name,
                    description: isKeystone
                        ? keystone.description
                        : `${blueprint.label} develops ${sector.identity.toLowerCase()} ${type === 'notable' ? 'This is a major cluster node.' : 'This is a supporting cluster node.'}`,
                    sector: sectorId, cluster: blueprint.label, type, depth, ...nodePosition, effects
                });
                ringIds.push(id);
            }
            connectRing(ringIds);
            link(travelId, ringIds[0]);
            clusters.push({ id: `${sectorId}-cluster-${depth}`, sector: sectorId, label: blueprint.label, x: center.x, y: center.y, radius: 99 });
            branchClusterIds[branchIndex].push(ringIds);
            if (previousRing) link(previousRing[2], ringIds[6]);
        });

        for (const branchDepth of [1, 3, 5]) {
            link(branchClusterIds[0][branchDepth][2], branchClusterIds[1][branchDepth][6]);
            link(branchClusterIds[1][branchDepth][2], branchClusterIds[2][branchDepth][6]);
        }
        link(branchClusterIds[0][4][1], branchClusterIds[2][4][7]);

        sector.specialists.forEach((specialistName, wheelIndex) => {
            const wheelAngle = sector.angle + PASSIVE_BRANCH_ANGLE_OFFSETS[wheelIndex];
            const center = passivePolarPosition(4320, wheelAngle);
            const ringIds = [];
            for (let nodeIndex = 0; nodeIndex < 10; nodeIndex++) {
                const nodePosition = offsetPassivePosition(center, 108, wheelAngle + 180 + nodeIndex * 36);
                const isNotable = nodeIndex === 3 || nodeIndex === 8;
                const id = `${sectorId}-specialist-${wheelIndex + 1}-${nodeIndex + 1}`;
                const baseEffects = getSpecialistMinorEffects(sector, wheelIndex, nodeIndex);
                addNode({
                    id,
                    name: isNotable
                        ? `${specialistName} ${nodeIndex === 3 ? 'Core' : 'Doctrine'}`
                        : specialistName,
                    description: `${specialistName} is an outer ${sector.label} specialization.${isNotable ? ' This is a major specialist node.' : ''}`,
                    sector: sectorId, cluster: specialistName, type: isNotable ? 'notable' : 'minor', depth: 19 + wheelIndex,
                    ...nodePosition,
                    effects: isNotable
                        ? mergePassiveEffects(baseEffects, baseEffects, getSectorIdentityEffects(sector, nodeIndex))
                        : baseEffects
                });
                ringIds.push(id);
            }
            connectRing(ringIds);
            link(branchClusterIds[wheelIndex][5][4], ringIds[0]);
            if (wheelIndex > 0) link(ringIds[7], `${sectorId}-specialist-${wheelIndex}-6`);
            clusters.push({ id: `${sectorId}-specialist-${wheelIndex + 1}`, sector: sectorId, label: specialistName, x: center.x, y: center.y, radius: 137, specialist: true });
        });
    }

    PASSIVE_BRIDGE_DEFINITIONS.forEach((bridge, bridgeIndex) => {
        const [leftSectorId, rightSectorId] = bridge.sectors;
        const leftSector = PASSIVE_SECTOR_DEFINITIONS[leftSectorId];
        const rightSector = PASSIVE_SECTOR_DEFINITIONS[rightSectorId];
        let angleDelta = rightSector.angle - leftSector.angle;
        if (angleDelta < 0) angleDelta += 360;
        const startAngle = leftSector.angle + PASSIVE_BRANCH_ANGLE_OFFSETS[2];
        const bridgeAngleSpan = angleDelta - (PASSIVE_BRANCH_ANGLE_OFFSETS[2] - PASSIVE_BRANCH_ANGLE_OFFSETS[0]);
        const ids = [];
        for (let index = 0; index < 17; index++) {
            const progress = (index + 1) / 18;
            const angle = startAngle + bridgeAngleSpan * progress;
            const radius = 3670 + Math.sin(progress * Math.PI) * 140;
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
        link(sectorClusterIds[leftSectorId][2][5][4], ids[0]);
        link(ids[ids.length - 1], sectorClusterIds[rightSectorId][0][5][4]);
    });

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
        damageTakenReduction: 0
    };
}

function accumulatePassiveEffects(target, effects, multiplier = 1) {
    for (const [key, value] of Object.entries(effects || {})) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            target[key] = target[key] || {};
            for (const [nestedKey, nestedValue] of Object.entries(value)) {
                target[key][nestedKey] = Number(target[key][nestedKey] || 0) + Number(nestedValue || 0) * multiplier;
            }
        } else {
            target[key] = Number(target[key] || 0) + Number(value || 0) * multiplier;
        }
    }
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
        for (const connection of node.connections || []) {
            const target = PASSIVE_NODE_BY_ID.get(connection);
            if (!target) errors.push(`${node.id} references missing node ${connection}`);
            else if (!target.connections.includes(node.id)) errors.push(`${node.id} -> ${connection} is not symmetric`);
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
    for (const sectorId of PASSIVE_TREE_SECTOR_ORDER) {
        const sectorNodes = passives.filter(node => node.sector === sectorId);
        if (sectorNodes.length < 185) errors.push(`${sectorId} sector is undersized`);
        if (sectorNodes.filter(node => node.type === 'keystone').length !== 5) errors.push(`${sectorId} requires exactly five keystones`);
        const lifeNodes = sectorNodes.filter(node => Number(node.effects.flatHealth || 0) > 0 || Number(node.effects.healthPercent || 0) > 0);
        const shieldNodes = sectorNodes.filter(node => Number(node.effects.flatEnergyShield || 0) > 0 || Number(node.effects.energyShieldPercent || 0) > 0);
        if (lifeNodes.length < 20) errors.push(`${sectorId} does not have enough distributed life access`);
        if (shieldNodes.length < 15) errors.push(`${sectorId} does not have enough distributed Energy Shield access`);
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
