export default {
    name: 'Phase-Step Leg Harness',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 39, max: 39 },
    healthBonus: { min: 600, max: 780 },
    energyShieldBonus: { min: 280, max: 360 },
    energyShieldBonusPercentRange: { min: 9, max: 13 },
    precision: { min: 5, max: 9 },
    deflection: { min: 4, max: 7 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Neural Network Module', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'High-Density Power Cell', quantity: 1 }
    ],
    description: 'A phase-tuned leg harness that reinforces your steps with a strong shield and precise control.'
};
