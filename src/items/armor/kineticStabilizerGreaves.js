export default {
    name: 'Kinetic Stabilizer Greaves',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 37, max: 37 },
    healthBonus: { min: 650, max: 820 },
    defenseTypes: {
        physicalResistance: { min: 15, max: 18 }
    },
    deflection: { min: 8, max: 12 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Neural Processor', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 2 }
    ],
    description: 'Stabilizer greaves that absorb kinetic shock and keep you planted through heavy impacts.'
};

