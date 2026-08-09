export default {
    name: 'Riveted Shin Guards',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 9, max: 9 },
    healthBonus: { min: 60, max: 80 },
    defenseTypes: {
        physicalResistance: { min: 3, max: 5 }
    },
    deflection: { min: 1, max: 2 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 4 },
        { name: 'Metal Fasteners', quantity: 1 }
    ],
    description: 'Riveted shin plating that stabilizes your stance against physical impacts.'
};

