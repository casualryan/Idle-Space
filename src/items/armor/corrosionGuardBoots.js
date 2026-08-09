export default {
    name: 'Corrosion Guard Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 24, max: 24 },
    healthBonus: { min: 130, max: 170 },
    defenseTypes: {
        chemicalResistance: { min: 6, max: 9 }
    },
    healthRegen: { min: 0.15, max: 0.35 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium', quantity: 2 },
        { name: 'Synthetic Biofluid', quantity: 1 }
    ],
    description: 'Corrosion-guard boots with slow neutralizer bleed for caustic terrain.'
};
