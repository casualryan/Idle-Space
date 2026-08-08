export default {
    name: 'Steel Sensor Helm',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 17, max: 17 },
    healthBonus: { min: 90, max: 120 },
    defenseTypes: {
        physicalResistance: { min: 5, max: 7 }
    },
    precision: { min: 6, max: 10 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 5 },
        { name: 'Titanium', quantity: 1 },
        { name: 'Targeting Module', quantity: 1 }
    ],
    description: 'Steel helm with sensor arrays that sharpen accuracy under pressure.'
};
