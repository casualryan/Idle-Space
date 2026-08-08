// lootPools.js - Defines the loot tiers, pools, and their contents

// Loot Tier Configuration
const LOOT_TIERS = {
    TIER_1: { id: 1, name: "Common", chance: 0.6 },
    TIER_2: { id: 2, name: "Uncommon", chance: 0.3 },
    TIER_3: { id: 3, name: "Rare", chance: 0.05 },
    TIER_4: { id: 4, name: "Very Rare", chance: 0.03 },
    TIER_5: { id: 5, name: "Epic", chance: 0.015 },
    TIER_6: { id: 6, name: "Legendary", chance: 0.005 }
};

// Loot Pools
// Each pool represents a collection of items with weights
// Higher weight = higher chance of being selected
const LOOT_POOLS = {
    // Tier 1 Pools (Common)
    lowRoboParts: {
        tier: 1,
        items: [
            { itemName: "Scrap Metal", weight: 150 },
            { itemName: "Minor Electronic Circuit", weight: 20 },
        ]
    },
    arachnidParts: {
        tier: 1,
        items: [
            { itemName: "Synthetic Poison Gland", weight: 20 },
            { itemName: "Spider Leg Segment", weight: 300 },
        ]
    },
    genericCommon: {
        tier: 1,
        items: [
            { itemName: "Scrap Metal", weight: 100 },
        ]
    },
    
    // Tier 2 Pools (Uncommon)
    basicComponents: {
        tier: 2,
        items: [
            { itemName: "Minor Electronic Circuit", weight: 100 },
            { itemName: "Basic Servo", weight: 80 },
            { itemName: "Small Power Cell", weight: 60 },
            { itemName: "Copper Coil", weight: 70 }
        ]
    },
    genericUncommon: {
        tier: 2,
        items: [
            { itemName: "Memory Chip", weight: 60 },
            { itemName: "Stabilizer", weight: 70 },
            { itemName: "Basic Sensor Array", weight: 50 }
        ]
    },
    
    // Tier 3 Pools (Rare)
    midRobotParts: {
        tier: 3,
        items: [
            { itemName: "Advanced Servo", weight: 70 },
            { itemName: "Targeting Module", weight: 50 },
            { itemName: "Power Converter", weight: 60 }
        ]
    },
    genericRare: {
        tier: 3,
        items: [
            { itemName: "Partical Fuser", weight: 60 },

        ]
    },
    
    // Tier 4 Pools (Very Rare)
    advancedComponents: {
        tier: 4,
        items: [
            { itemName: "Quantum Capacitor", weight: 70 },
            { itemName: "High-Density Power Cell", weight: 60 },
            { itemName: "Neural Network Module", weight: 50 }
        ]
    },
    
    // Tier 5 Pools (Epic)
    epicTech: {
        tier: 5,
        items: [
            { itemName: "Phase Converter", weight: 60 },
            { itemName: "AI Core Fragment", weight: 50 },
            { itemName: "Synthetic Biofluid", weight: 40 }
        ]
    },
    
    // Tier 6 Pools (Legendary)
    legendaryComponents: {
        tier: 6,
        items: [
            { itemName: "Quantum Core", weight: 50 },
            { itemName: "Temporal Stabilizer", weight: 40 },
            { itemName: "Nanite Cluster", weight: 30 }
        ]
    },

    // Corebound L1-50 progression zone pools
    z1Salvage: {
        tier: 1,
        items: [
            { itemName: "Scrap Metal", weight: 180 },
            { itemName: "Wire Bundle", weight: 110 },
            { itemName: "Metal Fasteners", weight: 95 }
        ]
    },
    z1Circuits: {
        tier: 2,
        items: [
            { itemName: "Basic Servo", weight: 80 },
            { itemName: "Wire Bundle", weight: 70 },
            { itemName: "Minor Electronic Circuit", weight: 35 },
            { itemName: "Basic Sensor Array", weight: 24 },
            { itemName: "Stabilizer", weight: 22 },
            { itemName: "Flame Shell", weight: 18 },
            { itemName: "Unstable Photon", weight: 14 },
            { itemName: "Crystalized Light", weight: 12 },
            { itemName: "Synthetic Poison Gland", weight: 18 }
        ]
    },
    z2Ore: {
        tier: 1,
        items: [
            { itemName: "Scrap Metal", weight: 80 },
            { itemName: "Iron Ore", weight: 120 },
            { itemName: "Copper Ore", weight: 120 }
        ]
    },
    z2Utility: {
        tier: 2,
        items: [
            { itemName: "Copper Coil", weight: 85 },
            { itemName: "Basic Sensor Array", weight: 60 },
            { itemName: "Basic Servo", weight: 70 },
            { itemName: "Stabilizer", weight: 30 },
            { itemName: "Titanium Thorn", weight: 28 },
            { itemName: "Pyro Core", weight: 12 }
        ]
    },
    z3Alloy: {
        tier: 2,
        items: [
            { itemName: "Titanium", weight: 90 },
            { itemName: "Iron Ore", weight: 70 },
            { itemName: "Pristine Metal Plate", weight: 50 },
            { itemName: "Titanium Alloy Fragment", weight: 30 },
            { itemName: "Titanium Plating", weight: 35 },
            { itemName: "Metal Scorpion Fang", weight: 24 }
        ]
    },
    z3Energy: {
        tier: 3,
        items: [
            { itemName: "Small Power Cell", weight: 80 },
            { itemName: "Stabilizer", weight: 70 },
            { itemName: "Copper Coil", weight: 60 },
            { itemName: "Flame Shell", weight: 35 },
            { itemName: "Pyro Core", weight: 20 }
        ]
    },
    z4Contamination: {
        tier: 3,
        items: [
            { itemName: "Synthetic Poison Gland", weight: 95 },
            { itemName: "Synthetic Biofluid", weight: 65 },
            { itemName: "Titanium", weight: 40 }
        ]
    },
    z4Hazard: {
        tier: 4,
        items: [
            { itemName: "Unstable Photon", weight: 70 },
            { itemName: "Crystalized Light", weight: 70 },
            { itemName: "Pyro Core", weight: 40 },
            { itemName: "Power Converter", weight: 35 }
        ]
    },
    z5Transit: {
        tier: 3,
        items: [
            { itemName: "Titanium Plating", weight: 85 },
            { itemName: "Advanced Servo", weight: 65 },
            { itemName: "Pristine Metal Plate", weight: 70 }
        ]
    },
    z5Targeting: {
        tier: 4,
        items: [
            { itemName: "Targeting Module", weight: 70 },
            { itemName: "Power Converter", weight: 70 },
            { itemName: "Neural Processor", weight: 55 },
            { itemName: "High-Density Power Cell", weight: 25 }
        ]
    },
    z6BioCorrosion: {
        tier: 4,
        items: [
            { itemName: "Synthetic Biofluid", weight: 85 },
            { itemName: "Synthetic Poison Gland", weight: 90 },
            { itemName: "Neural Processor", weight: 40 }
        ]
    },
    z6Research: {
        tier: 5,
        items: [
            { itemName: "AI Core Fragment", weight: 40 },
            { itemName: "Nanite Cluster", weight: 20 },
            { itemName: "Crystalized Light", weight: 55 },
            { itemName: "Unstable Photon", weight: 55 }
        ]
    },
    z7Phase: {
        tier: 4,
        items: [
            { itemName: "Quantum Capacitor", weight: 85 },
            { itemName: "High-Density Power Cell", weight: 70 },
            { itemName: "Phase Converter", weight: 65 }
        ]
    },
    z7Spire: {
        tier: 5,
        items: [
            { itemName: "Neural Network Module", weight: 65 },
            { itemName: "Targeting Module", weight: 55 },
            { itemName: "AI Core Fragment", weight: 40 },
            { itemName: "Titanium Alloy Fragment", weight: 45 }
        ]
    },
    z8Storm: {
        tier: 5,
        items: [
            { itemName: "Pyro Core", weight: 80 },
            { itemName: "Flame Shell", weight: 80 },
            { itemName: "Copper Coil", weight: 55 },
            { itemName: "Quantum Capacitor", weight: 55 }
        ]
    },
    z8Furnace: {
        tier: 6,
        items: [
            { itemName: "Flux Crystal", weight: 70 },
            { itemName: "AI Core Fragment", weight: 55 },
            { itemName: "Neural Network Module", weight: 45 },
            { itemName: "High-Density Power Cell", weight: 60 }
        ]
    },
    z9Isotope: {
        tier: 5,
        items: [
            { itemName: "Unstable Photon", weight: 80 },
            { itemName: "Crystalized Light", weight: 80 },
            { itemName: "Synthetic Biofluid", weight: 60 },
            { itemName: "Nanite Cluster", weight: 40 }
        ]
    },
    z9Cathedral: {
        tier: 6,
        items: [
            { itemName: "Quantum Core", weight: 60 },
            { itemName: "Temporal Stabilizer", weight: 55 },
            { itemName: "Flux Crystal", weight: 45 },
            { itemName: "AI Core Fragment", weight: 50 }
        ]
    },
    z10Titan: {
        tier: 6,
        items: [
            { itemName: "Quantum Core", weight: 70 },
            { itemName: "Temporal Stabilizer", weight: 65 },
            { itemName: "Nanite Cluster", weight: 60 },
            { itemName: "Flux Crystal", weight: 55 }
        ]
    },
    z10Core: {
        tier: 6,
        items: [
            { itemName: "Phase Converter", weight: 60 },
            { itemName: "AI Core Fragment", weight: 60 },
            { itemName: "Neural Network Module", weight: 50 },
            { itemName: "High-Density Power Cell", weight: 55 },
            { itemName: "Titanium Plating", weight: 45 },
            { itemName: "Advanced Servo", weight: 45 }
        ]
    }
};

const LOOT_POOL_ACQUISITION = Object.freeze({
    basicComponents: { level: 1, source: 'uncommon component drops in any progression delve' },
    midRobotParts: { level: 1, source: 'rare component drops in any progression delve' },
    advancedComponents: { level: 11, source: 'level 11+ progression delves' },
    epicTech: { level: 21, source: 'level 21+ progression delves' },
    legendaryComponents: { level: 31, source: 'level 31+ progression delves' },
    z1Salvage: { level: 1, source: 'Scrap Intake Yard' },
    z1Circuits: { level: 1, source: 'Scrap Intake Yard' },
    z2Ore: { level: 6, source: 'Rustbelt Service Tunnels' },
    z2Utility: { level: 6, source: 'Rustbelt Service Tunnels' },
    z3Alloy: { level: 11, source: 'Alloy Processing Floor' },
    z3Energy: { level: 11, source: 'Alloy Processing Floor' },
    z4Contamination: { level: 16, source: 'Contaminated Fabrication Wing' },
    z4Hazard: { level: 16, source: 'Contaminated Fabrication Wing' },
    z5Transit: { level: 21, source: 'Blackened Transit Grid' },
    z5Targeting: { level: 21, source: 'Blackened Transit Grid' },
    z6BioCorrosion: { level: 26, source: 'Bio-Corrosion Research Block' },
    z6Research: { level: 26, source: 'Bio-Corrosion Research Block' },
    z7Phase: { level: 31, source: 'Phase Assembly Spire' },
    z7Spire: { level: 31, source: 'Phase Assembly Spire' },
    z8Storm: { level: 36, source: 'Storm Furnace Complex' },
    z8Furnace: { level: 36, source: 'Storm Furnace Complex' },
    z9Isotope: { level: 41, source: 'Isotope Waste Cathedral' },
    z9Cathedral: { level: 41, source: 'Isotope Waste Cathedral' },
    z10Titan: { level: 46, source: 'Titan Foundry' },
    z10Core: { level: 46, source: 'Titan Foundry' }
});

const MATERIAL_ACQUISITION = {};
Object.entries(LOOT_POOLS).forEach(([poolName, pool]) => {
    const source = LOOT_POOL_ACQUISITION[poolName];
    if (!source) return;
    pool.items.forEach(entry => {
        const current = MATERIAL_ACQUISITION[entry.itemName];
        if (!current || source.level < current.level) {
            MATERIAL_ACQUISITION[entry.itemName] = { ...source };
        }
    });
});

const GATHERING_ACQUISITION = {
    'Scrap Metal': { level: 1, source: 'Mining: Collect Scrap Metal' },
    'Pristine Metal Plate': { level: 1, source: 'rarely while collecting Scrap Metal' },
    'Wire Bundle': { level: 2, source: 'Mining: Salvage Wire Bundles' },
    'Iron Ore': { level: 3, source: 'Mining: Mine Iron Ore' },
    'Metal Fasteners': { level: 4, source: 'Mining: Break Down Fastener Plates' },
    'Copper Ore': { level: 5, source: 'Mining: Mine Copper Ore' },
    'Stabilizer': { level: 8, source: 'Mining: Extract Stabilizer Ore' },
    'Titanium': { level: 10, source: 'Mining: Extract Titanium' },
    'Titanium Plating': { level: 16, source: 'Mining: Harvest Titanium Plating' },
    'Quantum Capacitor': { level: 24, source: 'Mining: Extract Quantum Fragments' }
};

Object.entries(GATHERING_ACQUISITION).forEach(([itemName, source]) => {
    const current = MATERIAL_ACQUISITION[itemName];
    if (!current || source.level < current.level) MATERIAL_ACQUISITION[itemName] = { ...source };
});

MATERIAL_ACQUISITION['Partical Fuser'] = {
    level: 1,
    source: 'Fabrication: Partical Fuser'
};

Object.freeze(MATERIAL_ACQUISITION);

// Export the data structures
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LOOT_TIERS,
        LOOT_POOLS,
        MATERIAL_ACQUISITION
    };
} else {
    window.MATERIAL_ACQUISITION = MATERIAL_ACQUISITION;
}
