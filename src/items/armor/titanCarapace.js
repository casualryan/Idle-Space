export default {
    name: 'Titan Carapace',
    type: 'Armor',
    icon: 'icons/heavy_armor.png',
    slot: 'chest',
    levelRequirement: { min: 46, max: 46 },
    healthBonus: { min: 2100, max: 2300 },
    defenseTypes: {
        physicalResistance: { min: 24, max: 28 }
    },
    deflection: { min: 8, max: 12 },
    attackSpeedModifier: { min: -6, max: -4 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 2 },
        { name: 'Flux Crystal', quantity: 1 },
        { name: 'Titanium Plating', quantity: 2 }
    ],
    description: 'Colossal carapace plating—the ultimate physical survival anchor.'
};
