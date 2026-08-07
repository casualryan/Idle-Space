export default {
    name: 'Chem-Sealed Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 15, max: 15 },
    healthBonus: { min: 70, max: 95 },
    defenseTypes: {
        chemicalResistance: { min: 3, max: 5 }
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 5 },
        { name: 'Synthetic Biofluid', quantity: 1 }
    ],
    description: 'Chem-sealed boots for safer movement through mildly hazardous zones.'
};
