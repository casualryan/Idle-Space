export default {
    name: 'Containment Rebreather Helm',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 50, max: 50 },
    healthBonus: { min: 1200, max: 1500 },
    defenseTypes: {
        chemicalResistance: { min: 22, max: 26 }
    },
    healthRegen: { min: 1.8, max: 2.5 },
    precision: { min: 8, max: 12 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 2 },
        { name: 'Flux Crystal', quantity: 1 },
        { name: 'AI Core Fragment', quantity: 1 }
    ],
    description: 'Top-tier containment rebreather for maximum chemical hazard survival.'
};
