export default {
    name: 'Phase-Step Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 39, max: 39 },
    healthBonus: { min: 380, max: 520 },
    energyShieldBonus: { min: 200, max: 280 },
    energyShieldBonusPercentRange: { min: 6, max: 9 },
    precision: { min: 4, max: 7 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Neural Processor', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'High-Density Power Cell', quantity: 1 }
    ],
    description: 'Phase-step boots that blend barrier tuning with precise footwork.'
};
