export default {
    name: 'Thermal Visor Helm',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 15, max: 15 },
    healthBonus: { min: 75, max: 100 },
    defenseTypes: {
        elementalResistance: { min: 4, max: 6 }
    },
    precision: { min: 4, max: 8 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 5 },
        { name: 'Copper Coil', quantity: 1 }
    ],
    description: 'Thermal visor plating that dampens elemental exposure and aids targeting.'
};
