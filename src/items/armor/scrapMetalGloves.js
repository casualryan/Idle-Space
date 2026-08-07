export default {
    name: 'Scrap Metal Gloves',
    type: 'Armor',
    icon: 'icons/scrap_metal_gloves.png',
    slot: 'gloves',
    levelRequirement: { min: 1, max: 1 },
    healthBonus: { min: 11, max: 18 },
    defenseTypes: {
        physicalResistance: { min: 1, max: 3 },
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 2 }
    ],
    description: 'Scrap Metal Gloves — salvaged hand protection tuned for combat grip and control.'
};
