export default {
    name: 'Steel Knuckle Plates',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 17, max: 17 },
    healthBonus: { min: 62, max: 79 },
    defenseTypes: {
        physicalResistance: { min: 2, max: 5 },
    },
    precision: { min: 2, max: 4 },
    attackSpeedModifier: { min: 1, max: 3 },
    damageTypes: {
        kinetic: { min: 2, max: 4 },
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium', quantity: 2 },
        { name: 'Titanium Plating', quantity: 1 },
        { name: 'Advanced Servo', quantity: 1 }
    ],
    description: 'Steel Knuckle Plates — salvaged hand protection tuned for combat grip and control.'
};
