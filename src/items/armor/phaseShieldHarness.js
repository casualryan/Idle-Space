export default {
    name: 'Phase Shield Harness',
    type: 'Armor',
    icon: 'icons/light_armor.png',
    slot: 'chest',
    levelRequirement: { min: 38, max: 38 },
    healthBonus: { min: 700, max: 850 },
    energyShieldBonus: { min: 400, max: 480 },
    energyShieldBonusPercentRange: { min: 10, max: 14 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Neural Processor', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'High-Density Power Cell', quantity: 1 }
    ],
    description: 'Phase-shifted barrier nodes woven into a chest harness for maximum shield output.'
};
