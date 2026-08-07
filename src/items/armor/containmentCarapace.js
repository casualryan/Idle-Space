export default {
    name: 'Containment Carapace',
    type: 'Armor',
    icon: 'icons/heavy_armor.png',
    slot: 'chest',
    levelRequirement: { min: 50, max: 50 },
    healthBonus: { min: 1800, max: 2100 },
    defenseTypes: {
        chemicalResistance: { min: 28, max: 32 }
    },
    healthRegen: { min: 2.0, max: 2.8 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 2 },
        { name: 'Flux Crystal', quantity: 1 },
        { name: 'AI Core Fragment', quantity: 1 }
    ],
    description: 'Top-tier containment plating for maximum chemical hazard survival.'
};
