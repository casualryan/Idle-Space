export default {
    name: 'Aegis Command Visor',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 48, max: 48 },
    healthBonus: { min: 1000, max: 1250 },
    defenseTypes: {
        elementalResistance: { min: 6, max: 9 }
    },
    energyShieldBonus: { min: 400, max: 520 },
    energyShieldBonusPercentRange: { min: 10, max: 14 },
    precision: { min: 35, max: 50 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 2 },
        { name: 'Neural Network Module', quantity: 1 },
        { name: 'High-Density Power Cell', quantity: 1 }
    ],
    description: 'Aegis command visor that projects a powerful barrier with tactical sensor clarity.'
};
