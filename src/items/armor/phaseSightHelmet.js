export default {
    name: 'Phase-Sight Helmet',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 39, max: 39 },
    healthBonus: { min: 480, max: 620 },
    energyShieldBonus: { min: 220, max: 300 },
    energyShieldBonusPercentRange: { min: 6, max: 9 },
    precision: { min: 22, max: 30 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Neural Network Module', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'High-Density Power Cell', quantity: 1 }
    ],
    description: 'Phase-sight helmet that blends barrier tuning with advanced targeting sensors.'
};
