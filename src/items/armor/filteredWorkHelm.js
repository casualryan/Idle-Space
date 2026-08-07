export default {
    name: 'Filtered Work Helm',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 10, max: 10 },
    healthBonus: { min: 50, max: 70 },
    defenseTypes: {
        chemicalResistance: { min: 2, max: 4 }
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 4 },
        { name: 'Synthetic Biofluid', quantity: 1 }
    ],
    description: 'A work helm with basic chemical filters for industrial zones.'
};
