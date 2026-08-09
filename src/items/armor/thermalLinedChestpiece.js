export default {
    name: 'Thermal Lined Chestpiece',
    type: 'Armor',
    icon: 'icons/heavy_armor.png',
    slot: 'chest',
    levelRequirement: { min: 13, max: 13 },
    healthBonus: { min: 120, max: 160 },
    defenseTypes: {
        elementalResistance: { min: 6, max: 9 }
    },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 5 },
        { name: 'Copper Coil', quantity: 1 },
        { name: 'Basic Servo', quantity: 1 }
    ],
    description: 'Insulated lining that dampens pyro, cryo, and electric trauma.'
};
