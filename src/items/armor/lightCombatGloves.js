export default {
    name: 'Light Combat Gloves',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 5, max: 5 },
    healthBonus: { min: 24, max: 33 },
    defenseTypes: {
        physicalResistance: { min: 1, max: 3 },
    },
    precision: { min: 1, max: 2 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 3 },
        { name: 'Wire Bundle', quantity: 1 }
    ],
    description: 'Light Combat Gloves — salvaged hand protection tuned for combat grip and control.'
};
