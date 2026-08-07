export default {
    name: 'Stormsight Reactor Helm',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 50, max: 50 },
    healthBonus: { min: 1100, max: 1400 },
    defenseTypes: {
        elementalResistance: { min: 22, max: 26 }
    },
    energyShieldBonus: { min: 350, max: 500 },
    precision: { min: 12, max: 18 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 2 },
        { name: 'Flux Crystal', quantity: 1 },
        { name: 'Neural Network Module', quantity: 1 }
    ],
    description: 'Stormsight reactor helm—the pinnacle of elemental defense and tactical awareness.'
};
