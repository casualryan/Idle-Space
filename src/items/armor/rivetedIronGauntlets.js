export default {
    name: 'Riveted Iron Gauntlets',
    type: 'Armor',
    icon: 'icons/riveted_iron_gauntlets.png',
    slot: 'gloves',
    levelRequirement: { min: 7, max: 7 },
    healthBonus: { min: 30, max: 41 },
    defenseTypes: {
        physicalResistance: { min: 1, max: 3 },
    },
    precision: { min: 1, max: 2 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 3 },
        { name: 'Wire Bundle', quantity: 1 }
    ],
    description: 'Riveted Iron Gauntlets — salvaged hand protection tuned for combat grip and control.'
};
