export default {
    name: 'Patchwork Work Gloves',
    type: 'Armor',
    icon: 'icons/default-icon.png',
    slot: 'gloves',
    levelRequirement: { min: 3, max: 3 },
    healthBonus: { min: 18, max: 25 },
    defenseTypes: {
        physicalResistance: { min: 1, max: 3 },
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 2 }
    ],
    description: 'Patchwork Work Gloves — salvaged hand protection tuned for combat grip and control.'
};
