export default {
    name: 'Corrosion Guard Gloves',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 24, max: 24 },
    healthBonus: { min: 85, max: 105 },
    defenseTypes: {
        chemicalResistance: { min: 2, max: 5 },
    },
    precision: { min: 4, max: 6 },
    attackSpeedModifier: { min: 1, max: 4 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium', quantity: 2 },
        { name: 'Titanium Plating', quantity: 1 },
        { name: 'Advanced Servo', quantity: 1 }
    ],
    description: 'Corrosion Guard Gloves — salvaged hand protection tuned for combat grip and control.'
};
