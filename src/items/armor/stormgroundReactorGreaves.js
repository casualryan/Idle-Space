export default {
    name: 'Stormground Reactor Greaves',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 50, max: 50 },
    healthBonus: { min: 1100, max: 1450 },
    defenseTypes: {
        elementalResistance: { min: 22, max: 26 }
    },
    energyShieldBonus: { min: 350, max: 520 },
    deflection: { min: 6, max: 10 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 2 },
        { name: 'Flux Crystal', quantity: 1 },
        { name: 'Neural Network Module', quantity: 1 }
    ],
    description: 'Stormground greaves that blend elemental protection, barrier support, and stable footing.'
};

