export default {
    name: 'Steel Leg Carapace',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 17, max: 17 },
    healthBonus: { min: 130, max: 170 },
    defenseTypes: {
        physicalResistance: { min: 6, max: 8 }
    },
    deflection: { min: 2, max: 4 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 6 },
        { name: 'Titanium', quantity: 1 },
        { name: 'Metal Fasteners', quantity: 1 }
    ],
    description: 'Steel-reinforced leg plating built for stability and physical punishment.'
};

