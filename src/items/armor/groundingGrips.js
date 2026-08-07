export default {
    name: 'Grounding Grips',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 10, max: 10 },
    healthBonus: { min: 40, max: 52 },
    defenseTypes: {
        elementalResistance: { min: 1, max: 3 },
    },
    precision: { min: 1, max: 2 },
    attackSpeedModifier: { min: 1, max: 2 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 4 },
        { name: 'Wire Bundle', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 1 }
    ],
    description: 'Grounding Grips — salvaged hand protection tuned for combat grip and control.'
};
