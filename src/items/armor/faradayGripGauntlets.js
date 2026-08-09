export default {
    name: 'Faraday Grip Gauntlets',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 22, max: 22 },
    healthBonus: { min: 78, max: 98 },
    defenseTypes: {
        elementalResistance: { min: 2, max: 5 },
    },
    precision: { min: 3, max: 5 },
    attackSpeedModifier: { min: 1, max: 3 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium', quantity: 2 },
        { name: 'Titanium Plating', quantity: 1 },
        { name: 'Advanced Servo', quantity: 1 }
    ],
    description: 'Faraday Grip Gauntlets — salvaged hand protection tuned for combat grip and control.'
};
