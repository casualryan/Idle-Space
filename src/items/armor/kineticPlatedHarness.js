export default {
    name: 'Kinetic Plated Harness',
    type: 'Armor',
    icon: 'icons/heavy_armor.png',
    slot: 'chest',
    levelRequirement: { min: 36, max: 36 },
    healthBonus: { min: 750, max: 900 },
    defenseTypes: {
        physicalResistance: { min: 18, max: 22 }
    },
    deflection: { min: 5, max: 8 },
    attackSpeedModifier: { min: -5, max: -3 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Neural Network Module', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 2 }
    ],
    description: 'Heavy kinetic plating that trades mobility for unmatched physical resilience.'
};
