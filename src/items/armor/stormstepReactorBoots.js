export default {
    name: 'Stormstep Reactor Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 50, max: 50 },
    healthBonus: { min: 900, max: 1100 },
    defenseTypes: {
        elementalResistance: { min: 18, max: 22 }
    },
    energyShieldBonus: { min: 300, max: 450 },
    deflection: { min: 5, max: 8 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 2 },
        { name: 'Flux Crystal', quantity: 1 },
        { name: 'Neural Network Module', quantity: 1 }
    ],
    description: 'Stormstep reactor boots that ground elemental fury and reinforce your footing.'
};
