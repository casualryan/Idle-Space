export default {
    name: 'Titan Leg Carapace',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 47, max: 47 },
    healthBonus: { min: 1300, max: 1600 },
    defenseTypes: {
        physicalResistance: { min: 18, max: 24 }
    },
    deflection: { min: 12, max: 18 },
    attackSpeedModifier: { min: -4, max: -2 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 2 },
        { name: 'Flux Crystal', quantity: 1 },
        { name: 'Titanium Plating', quantity: 2 }
    ],
    description: 'Massive titan leg plating that anchors you through physical punishment.'
};

