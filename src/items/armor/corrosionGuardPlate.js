export default {
    name: 'Corrosion Guard Plate',
    type: 'Armor',
    icon: 'icons/heavy_armor.png',
    slot: 'chest',
    levelRequirement: { min: 23, max: 23 },
    healthBonus: { min: 300, max: 380 },
    defenseTypes: {
        chemicalResistance: { min: 10, max: 14 }
    },
    healthRegen: { min: 0.3, max: 0.6 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium', quantity: 3 },
        { name: 'Titanium Plating', quantity: 1 },
        { name: 'Synthetic Biofluid', quantity: 1 }
    ],
    description: 'Sealed plating with slow-release neutralizers for caustic exposure.'
};
