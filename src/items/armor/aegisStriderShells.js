export default {
    name: 'Aegis Strider Shells',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 49, max: 49 },
    healthBonus: { min: 1050, max: 1400 },
    defenseTypes: {
        elementalResistance: { min: 8, max: 12 }
    },
    energyShieldBonus: { min: 520, max: 680 },
    energyShieldBonusPercentRange: { min: 12, max: 16 },
    precision: { min: 6, max: 10 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 2 },
        { name: 'Neural Network Module', quantity: 1 },
        { name: 'High-Density Power Cell', quantity: 1 }
    ],
    description: 'Aegis-grade strider shells that project a powerful barrier without dulling control.'
};

