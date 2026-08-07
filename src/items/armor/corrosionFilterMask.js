export default {
    name: 'Corrosion Filter Mask',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 24, max: 24 },
    healthBonus: { min: 170, max: 220 },
    defenseTypes: {
        chemicalResistance: { min: 8, max: 11 }
    },
    healthRegen: { min: 0.2, max: 0.4 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium', quantity: 2 },
        { name: 'Synthetic Biofluid', quantity: 1 }
    ],
    description: 'Filtered mask that seals against caustic fumes with slow neutralizer bleed.'
};
