export default {
    name: 'Aegis-Tread Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 48, max: 48 },
    healthBonus: { min: 750, max: 950 },
    defenseTypes: {
        elementalResistance: { min: 5, max: 8 }
    },
    energyShieldBonus: { min: 400, max: 500 },
    energyShieldBonusPercentRange: { min: 10, max: 14 },
    precision: { min: 4, max: 6 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 2 },
        { name: 'Neural Network Module', quantity: 1 },
        { name: 'High-Density Power Cell', quantity: 1 }
    ],
    description: 'Aegis-tread boots that project a strong barrier without dulling your stride.'
};
