// Material economy loot pools. Enemies always carry a level-scaled foundation
// pool, then add damage-family pools that make their actual combat identity the
// best way to target thematic components.

const LOOT_TIERS = Object.freeze({
    TIER_1: Object.freeze({ id: 1, name: 'Foundation', chance: 0.6 }),
    TIER_2: Object.freeze({ id: 2, name: 'Identity Material', chance: 0.3 }),
    TIER_3: Object.freeze({ id: 3, name: 'Focused Thematic', chance: 0.05 }),
    TIER_4: Object.freeze({ id: 4, name: 'Specialized', chance: 0.03 }),
    TIER_5: Object.freeze({ id: 5, name: 'Apex', chance: 0.015 }),
    TIER_6: Object.freeze({ id: 6, name: 'Exceptional', chance: 0.005 })
});

const LOOT_THEME_LADDERS = Object.freeze({
    kinetic: Object.freeze(['Stabilizer', 'Advanced Barrel', 'Precision Mechanism']),
    slashing: Object.freeze(['Titanium Thorn', 'Metal Scorpion Fang', 'Enhanced Cutting Edge']),
    pyro: Object.freeze(['Flame Shell', 'Pyro Core', 'Flux Crystal']),
    cryo: Object.freeze(['Cryo Cell', 'Unstable Phase Core', 'Temporal Stabilizer']),
    electric: Object.freeze(['Copper Coil', 'High-Density Power Cell', 'Quantum Capacitor']),
    corrosive: Object.freeze(['Toxic Residue', 'Synthetic Poison Gland', 'Synthetic Biofluid']),
    radiation: Object.freeze(['Unstable Photon', 'Crystalized Light', 'Nanite Cluster'])
});

const LOOT_THEME_SOURCE_ZONES = Object.freeze({
    kinetic: Object.freeze([1, 3, 7]),
    slashing: Object.freeze([1, 3, 7]),
    electric: Object.freeze([1, 3, 7]),
    corrosive: Object.freeze([2, 4, 7]),
    pyro: Object.freeze([1, 3, 7]),
    cryo: Object.freeze([4, 4, 7]),
    radiation: Object.freeze([4, 4, 7])
});

const LOOT_ZONE_LEVELS = Object.freeze([1, 1, 6, 11, 16, 21, 26, 31, 36, 41, 46]);
const LOOT_ZONE_NAMES = Object.freeze([
    '',
    'Scrap Intake Yard',
    'Rustbelt Service Tunnels',
    'Alloy Processing Floor',
    'Contaminated Fabrication Wing',
    'Blackened Transit Grid',
    'Bio-Corrosion Research Block',
    'Phase Assembly Spire',
    'Storm Furnace Complex',
    'Isotope Waste Cathedral',
    'Titan Foundry Depths'
]);

function lootEntry(itemName, weight, minQuantity = 1, maxQuantity = minQuantity, quantityClass = 'fixed') {
    return Object.freeze({ itemName, weight, minQuantity, maxQuantity, quantityClass });
}

const LOOT_FOUNDATION_POOL_DATA = Object.freeze([
    null,
    Object.freeze([
        lootEntry('Scrap Metal', 120, 3, 5), lootEntry('Metal Fasteners', 100, 1, 2),
        lootEntry('Wire Bundle', 100, 1, 2), lootEntry('Minor Electronic Circuit', 45, 1, 1),
        lootEntry('Basic Servo', 35, 1, 1)
    ]),
    Object.freeze([
        lootEntry('Scrap Metal', 70, 4, 7), lootEntry('Metal Fasteners', 100, 2, 4),
        lootEntry('Wire Bundle', 100, 2, 4), lootEntry('Iron Ore', 80, 2, 4),
        lootEntry('Copper Ore', 80, 2, 4), lootEntry('Minor Electronic Circuit', 50, 1, 2),
        lootEntry('Basic Servo', 45, 1, 2)
    ]),
    Object.freeze([
        lootEntry('Scrap Metal', 45, 5, 9), lootEntry('Metal Fasteners', 100, 3, 5),
        lootEntry('Wire Bundle', 100, 3, 5), lootEntry('Iron Ore', 65, 3, 5),
        lootEntry('Copper Ore', 65, 3, 5), lootEntry('Titanium', 80, 2, 4),
        lootEntry('Minor Electronic Circuit', 55, 2, 3), lootEntry('Basic Servo', 50, 2, 3)
    ]),
    Object.freeze([
        lootEntry('Scrap Metal', 35, 6, 10), lootEntry('Metal Fasteners', 105, 4, 7),
        lootEntry('Wire Bundle', 105, 4, 7), lootEntry('Titanium', 85, 3, 5),
        lootEntry('Titanium Plating', 55, 2, 4), lootEntry('Minor Electronic Circuit', 50, 2, 4),
        lootEntry('Basic Servo', 50, 2, 4)
    ]),
    Object.freeze([
        lootEntry('Scrap Metal', 25, 7, 11), lootEntry('Metal Fasteners', 110, 5, 9),
        lootEntry('Wire Bundle', 110, 5, 9), lootEntry('Titanium', 65, 4, 6),
        lootEntry('Titanium Plating', 80, 3, 5), lootEntry('Advanced Servo', 55, 1, 3),
        lootEntry('Advanced Electronic Circuit', 50, 1, 3), lootEntry('Minor Electronic Circuit', 45, 2, 4)
    ]),
    Object.freeze([
        lootEntry('Metal Fasteners', 115, 6, 11), lootEntry('Wire Bundle', 115, 6, 11),
        lootEntry('Titanium', 55, 5, 8), lootEntry('Titanium Plating', 85, 3, 6),
        lootEntry('Advanced Servo', 65, 2, 4), lootEntry('Advanced Electronic Circuit', 60, 2, 4),
        lootEntry('Minor Electronic Circuit', 50, 3, 5)
    ]),
    Object.freeze([
        lootEntry('Metal Fasteners', 120, 7, 13), lootEntry('Wire Bundle', 120, 7, 13),
        lootEntry('Titanium Plating', 90, 4, 7), lootEntry('Advanced Servo', 70, 3, 5),
        lootEntry('Advanced Electronic Circuit', 70, 2, 4), lootEntry('Minor Electronic Circuit', 55, 4, 6),
        lootEntry('Advanced Alloy', 45, 1, 3)
    ]),
    Object.freeze([
        lootEntry('Metal Fasteners', 125, 8, 15), lootEntry('Wire Bundle', 125, 8, 15),
        lootEntry('Titanium Plating', 90, 5, 8), lootEntry('Advanced Servo', 75, 4, 6),
        lootEntry('Advanced Electronic Circuit', 75, 3, 5), lootEntry('Minor Electronic Circuit', 60, 5, 8),
        lootEntry('Advanced Alloy', 65, 2, 4)
    ]),
    Object.freeze([
        lootEntry('Metal Fasteners', 130, 10, 17), lootEntry('Wire Bundle', 130, 10, 17),
        lootEntry('Titanium Plating', 85, 6, 10), lootEntry('Advanced Servo', 75, 5, 8),
        lootEntry('Advanced Electronic Circuit', 80, 4, 6), lootEntry('Minor Electronic Circuit', 65, 6, 10),
        lootEntry('Advanced Alloy', 80, 3, 5)
    ]),
    Object.freeze([
        lootEntry('Metal Fasteners', 135, 12, 20), lootEntry('Wire Bundle', 135, 12, 20),
        lootEntry('Titanium Plating', 85, 8, 12), lootEntry('Advanced Servo', 75, 6, 10),
        lootEntry('Advanced Electronic Circuit', 85, 5, 8), lootEntry('Minor Electronic Circuit', 65, 8, 12),
        lootEntry('Advanced Alloy', 95, 4, 7)
    ])
]);

const LOOT_POOLS = {
    // Compatibility pools used by a handful of non-progression fixtures.
    lowRoboParts: { tier: 1, items: [lootEntry('Scrap Metal', 100, 2, 4), lootEntry('Wire Bundle', 65, 1, 2)] },
    arachnidParts: { tier: 1, items: [lootEntry('Titanium Thorn', 90, 1, 2), lootEntry('Toxic Residue', 55, 1, 2)] },
    genericCommon: { tier: 1, items: [lootEntry('Scrap Metal', 100, 2, 4), lootEntry('Metal Fasteners', 80, 1, 2)] },
    basicComponents: { tier: 2, items: [lootEntry('Minor Electronic Circuit', 80), lootEntry('Basic Servo', 75), lootEntry('Wire Bundle', 65, 1, 2), lootEntry('Copper Coil', 55, 1, 2, 'thematicCommon')] },
    genericUncommon: { tier: 2, items: [lootEntry('Stabilizer', 75, 1, 2, 'thematicCommon'), lootEntry('Titanium Thorn', 70, 1, 2, 'thematicCommon'), lootEntry('Toxic Residue', 60, 1, 2, 'thematicCommon')] },
    midRobotParts: { tier: 3, items: [lootEntry('Advanced Servo', 75), lootEntry('Titanium Plating', 70), lootEntry('Advanced Electronic Circuit', 60)] },
    genericRare: { tier: 3, items: [lootEntry('Advanced Barrel', 55, 1, 1, 'thematicAdvanced'), lootEntry('High-Density Power Cell', 50, 1, 1, 'thematicAdvanced')] },
    advancedComponents: { tier: 4, items: [lootEntry('Advanced Alloy', 70), lootEntry('Targeting Module', 40), lootEntry('Neural Network Module', 25)] },
    epicTech: { tier: 5, items: [lootEntry('AI Core Fragment', 55), lootEntry('Phase Converter', 35)] },
    legendaryComponents: { tier: 6, items: [lootEntry('Quantum Core', 40)] },
    exceptionalPrecision: { tier: 4, items: [lootEntry('Targeting Module', 100)] },
    exceptionalTech: { tier: 5, items: [
        lootEntry('AI Core Fragment', 60), lootEntry('Neural Network Module', 40), lootEntry('Phase Converter', 35),
        lootEntry('Kinetic Driver Chip II', 5), lootEntry('Slashing Edge Chip II', 5),
        lootEntry('Pyro Injector Chip II', 5), lootEntry('Cryo Injector Chip II', 5),
        lootEntry('Electric Injector Chip II', 5), lootEntry('Corrosive Injector Chip II', 5),
        lootEntry('Radiation Injector Chip II', 5), lootEntry('Integrity Buffer Chip II', 8),
        lootEntry('Shield Buffer Chip II', 8), lootEntry('Emergency Recovery Chip', 8)
    ] },
    exceptionalApex: { tier: 6, items: [
        lootEntry('Quantum Core', 100),
        lootEntry('Redline Kernel', 12), lootEntry('Bastion Kernel', 12),
        lootEntry('Recursive Strike Kernel', 12), lootEntry('Predator Kernel', 12),
        lootEntry('Harmonic Bionic Kernel', 12), lootEntry('Critical Singularity Kernel', 12),
        lootEntry('Reprisal Kernel', 12)
    ] }
};

for (let zone = 1; zone <= 10; zone++) {
    LOOT_POOLS[`foundationZ${zone}`] = { tier: 1, items: LOOT_FOUNDATION_POOL_DATA[zone] };
}

const LOOT_THEME_POOL_SUFFIXES = ['Common', 'Advanced', 'Apex'];
const LOOT_THEME_QUANTITY_CLASSES = ['thematicCommon', 'thematicAdvanced', 'thematicApex'];
Object.entries(LOOT_THEME_LADDERS).forEach(([family, ladder]) => {
    ladder.forEach((itemName, index) => {
        const suffix = LOOT_THEME_POOL_SUFFIXES[index];
        LOOT_POOLS[`theme${family[0].toUpperCase()}${family.slice(1)}${suffix}`] = {
            tier: index + 2,
            items: [lootEntry(itemName, 100, 1, index === 0 ? 2 : 1, LOOT_THEME_QUANTITY_CLASSES[index])]
        };
    });
});

for (let zone = 1; zone <= 10; zone++) {
    const items = [];
    Object.entries(LOOT_THEME_LADDERS).forEach(([family, ladder]) => {
        ladder.forEach((itemName, index) => {
            if (zone < LOOT_THEME_SOURCE_ZONES[family][index]) return;
            items.push(lootEntry(itemName, index === 0 ? 45 : (index === 1 ? 24 : 8), 1, index === 0 ? 2 : 1, LOOT_THEME_QUANTITY_CLASSES[index]));
        });
    });
    LOOT_POOLS[`legacyThemesZ${zone}`] = { tier: 4, items };
}

Object.values(LOOT_POOLS).forEach(pool => Object.freeze(pool));
Object.freeze(LOOT_POOLS);

const LOOT_POOL_ACQUISITION = {
    lowRoboParts: { level: 1, source: 'common robotic enemies' },
    arachnidParts: { level: 1, source: 'common specialized enemies' },
    genericCommon: { level: 1, source: 'common enemy salvage' },
    basicComponents: { level: 1, source: 'uncommon component drops' },
    genericUncommon: { level: 1, source: 'uncommon thematic drops' },
    midRobotParts: { level: 11, source: 'advanced robotic enemies' },
    genericRare: { level: 11, source: 'advanced thematic enemies' },
    advancedComponents: { level: 21, source: 'specialized high-level enemies' },
    epicTech: { level: 26, source: 'exceptional technology drops' },
    legendaryComponents: { level: 41, source: 'apex technology drops' },
    exceptionalPrecision: { level: 21, source: 'precision and targeting enemies' },
    exceptionalTech: { level: 26, source: 'advanced AI and phase enemies' },
    exceptionalApex: { level: 41, source: 'apex enemies' }
};

for (let zone = 1; zone <= 10; zone++) {
    LOOT_POOL_ACQUISITION[`foundationZ${zone}`] = { level: LOOT_ZONE_LEVELS[zone], source: LOOT_ZONE_NAMES[zone] };
    LOOT_POOL_ACQUISITION[`legacyThemesZ${zone}`] = { level: LOOT_ZONE_LEVELS[zone], source: `${LOOT_ZONE_NAMES[zone]} secondary thematic salvage` };
}

Object.entries(LOOT_THEME_LADDERS).forEach(([family, ladder]) => {
    ladder.forEach((itemName, index) => {
        const zone = LOOT_THEME_SOURCE_ZONES[family][index];
        const suffix = LOOT_THEME_POOL_SUFFIXES[index];
        LOOT_POOL_ACQUISITION[`theme${family[0].toUpperCase()}${family.slice(1)}${suffix}`] = {
            level: LOOT_ZONE_LEVELS[zone],
            source: `${family === 'corrosive' ? 'corrosive' : family} enemies in ${LOOT_ZONE_NAMES[zone]} or later delves`
        };
    });
});

const MATERIAL_ACQUISITION = {};
Object.entries(LOOT_POOLS).forEach(([poolName, pool]) => {
    const source = LOOT_POOL_ACQUISITION[poolName];
    if (!source) return;
    pool.items.forEach(entry => {
        const current = MATERIAL_ACQUISITION[entry.itemName];
        if (!current || source.level < current.level) MATERIAL_ACQUISITION[entry.itemName] = { ...source };
    });
});

const GATHERING_ACQUISITION = {
    'Scrap Metal': { level: 1, source: 'Mining: Collect Scrap Metal' },
    'Wire Bundle': { level: 2, source: 'Mining: Salvage Wire Bundles' },
    'Iron Ore': { level: 3, source: 'Mining: Mine Iron Ore' },
    'Metal Fasteners': { level: 4, source: 'Mining: Break Down Fastener Plates' },
    'Copper Ore': { level: 5, source: 'Mining: Mine Copper Ore' },
    'Titanium': { level: 10, source: 'Mining: Extract Titanium' },
    'Titanium Plating': { level: 16, source: 'Mining: Harvest Titanium Plating' },
    'Quantum Capacitor': { level: 24, source: 'Mining: Extract Quantum Fragments' }
};

Object.entries(GATHERING_ACQUISITION).forEach(([itemName, source]) => {
    const current = MATERIAL_ACQUISITION[itemName];
    if (!current || source.level < current.level) MATERIAL_ACQUISITION[itemName] = { ...source };
});
Object.freeze(MATERIAL_ACQUISITION);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LOOT_TIERS, LOOT_POOLS, MATERIAL_ACQUISITION };
} else {
    window.MATERIAL_ACQUISITION = MATERIAL_ACQUISITION;
}
