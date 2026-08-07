export default {
    name: 'Alloy Plated Gauntlets',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 26, max: 26 },
    healthBonus: { min: 91, max: 113 },
    defenseTypes: {
        physicalResistance: { min: 2, max: 5 },
    },
    precision: { min: 4, max: 6 },
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
    description: 'Alloy Plated Gauntlets — salvaged hand protection tuned for combat grip and control.'
};
