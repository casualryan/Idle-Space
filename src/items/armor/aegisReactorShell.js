export default {
    name: 'Aegis Reactor Shell',
    type: 'Armor',
    icon: 'icons/heavy_armor.png',
    slot: 'chest',
    levelRequirement: { min: 48, max: 48 },
    healthBonus: { min: 1400, max: 1700 },
    defenseTypes: {
        elementalResistance: { min: 6, max: 10 }
    },
    energyShieldBonus: { min: 850, max: 950 },
    energyShieldBonusPercentRange: { min: 12, max: 16 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 2 },
        { name: 'Neural Network Module', quantity: 1 },
        { name: 'High-Density Power Cell', quantity: 1 }
    ],
    description: 'A reactor-backed shell that projects an overwhelming energy barrier.'
};
