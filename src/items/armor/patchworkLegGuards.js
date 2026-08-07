export default {
    name: 'Patchwork Leg Guards',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 4, max: 4 },
    healthBonus: { min: 24, max: 38 },
    defenseTypes: {
        physicalResistance: { min: 1, max: 2 },
        elementalResistance: { min: 1, max: 2 },
        chemicalResistance: { min: 1, max: 2 }
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 3 },
        { name: 'Wire Bundle', quantity: 1 }
    ],
    description: 'Improvised guards with modest all-around protection and decent freedom of movement.'
};

