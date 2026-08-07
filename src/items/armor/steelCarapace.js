export default {
    name: 'Steel Carapace',
    type: 'Armor',
    icon: 'icons/heavy_armor.png',
    slot: 'chest',
    levelRequirement: { min: 16, max: 16 },
    healthBonus: { min: 180, max: 240 },
    defenseTypes: {
        physicalResistance: { min: 8, max: 10 }
    },
    deflection: { min: 2, max: 3 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 6 },
        { name: 'Copper Coil', quantity: 1 },
        { name: 'Titanium', quantity: 1 }
    ],
    description: 'A solid steel shell that turns aside glancing blows.'
};
