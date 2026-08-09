export default {
    name: 'Servo-Assist Gloves',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 29, max: 29 },
    healthBonus: { min: 101, max: 124 },
    defenseTypes: {
        physicalResistance: { min: 5, max: 10 },
    },
    precision: { min: 4, max: 7 },
    attackSpeedModifier: { min: 1, max: 4 },
    damageTypes: {
        kinetic: { min: 2, max: 4 },
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium', quantity: 2 },
        { name: 'Titanium Plating', quantity: 1 },
        { name: 'Advanced Servo', quantity: 1 }
    ],
    description: 'Servo-Assist Gloves — salvaged hand protection tuned for combat grip and control.'
};
