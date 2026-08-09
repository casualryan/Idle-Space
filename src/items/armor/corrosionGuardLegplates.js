export default {
    name: 'Corrosion Guard Legplates',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 24, max: 24 },
    healthBonus: { min: 210, max: 280 },
    defenseTypes: {
        chemicalResistance: { min: 8, max: 12 }
    },
    healthRegen: { min: 0.2, max: 0.5 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Titanium', quantity: 3 },
        { name: 'Titanium Plating', quantity: 1 },
        { name: 'Synthetic Biofluid', quantity: 1 }
    ],
    description: 'Chemical-sealed legplates with slow neutralizer bleed to survive caustic exposure.'
};

