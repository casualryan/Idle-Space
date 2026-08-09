export default {
    name: 'Steel-Toed Greaves',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 17, max: 17 },
    healthBonus: { min: 85, max: 115 },
    defenseTypes: {
        physicalResistance: { min: 4, max: 6 }
    },
    deflection: { min: 2, max: 3 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 5 },
        { name: 'Titanium', quantity: 1 },
        { name: 'Metal Fasteners', quantity: 1 }
    ],
    description: 'Steel-toed greaves built for heavy footing and physical resilience.'
};
