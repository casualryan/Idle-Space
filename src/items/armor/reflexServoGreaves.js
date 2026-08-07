export default {
    name: 'Reflex Servo Greaves',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 41, max: 41 },
    healthBonus: { min: 850, max: 1050 },
    defenseTypes: {
        elementalResistance: { min: 10, max: 14 }
    },
    precision: { min: 10, max: 16 },
    attackSpeedModifier: { min: 5, max: 9 },
    deflection: { min: 5, max: 8 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Neural Processor', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 2 }
    ],
    description: 'Reflex-tuned servo greaves that favor speed and precision with light elemental insulation.'
};

