export default {
    name: 'Photon Strike Gloves',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 19, max: 19 },
    healthBonus: { min: 69, max: 86 },
    defenseTypes: {
        elementalResistance: { min: 2, max: 5 },
    },
    precision: { min: 3, max: 4 },
    attackSpeedModifier: { min: 1, max: 3 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium', quantity: 2 },
        { name: 'Titanium Plating', quantity: 1 },
        { name: 'Advanced Servo', quantity: 1 }
    ],
    description: 'Photon Strike Gloves — salvaged hand protection tuned for combat grip and control.'
};
