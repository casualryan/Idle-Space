export default {
    name: 'Calibrated Reflex Armor',
    type: 'Armor',
    icon: 'icons/light_armor.png',
    slot: 'chest',
    levelRequirement: { min: 40, max: 40 },
    healthBonus: { min: 800, max: 950 },
    defenseTypes: {
        elementalResistance: { min: 18, max: 22 }
    },
    precision: { min: 10, max: 14 },
    attackSpeedModifier: { min: 5, max: 8 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Neural Processor', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 2 }
    ],
    description: 'Sensor-calibrated armor that sharpens reflexes and elemental tolerance.'
};
