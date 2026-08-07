export default {
    name: 'Insulated Leg Wraps',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 14, max: 14 },
    healthBonus: { min: 105, max: 140 },
    defenseTypes: {
        elementalResistance: { min: 5, max: 7 }
    },
    deflection: { min: 2, max: 3 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 5 },
        { name: 'Copper Coil', quantity: 1 },
        { name: 'Basic Servo', quantity: 1 }
    ],
    description: 'Insulated wraps that steady your movement while blunting elemental shock.'
};

