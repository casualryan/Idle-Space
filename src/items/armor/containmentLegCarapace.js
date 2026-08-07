export default {
    name: 'Containment Leg Carapace',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 50, max: 50 },
    healthBonus: { min: 1200, max: 1500 },
    defenseTypes: {
        chemicalResistance: { min: 22, max: 26 }
    },
    healthRegen: { min: 1.8, max: 2.6 },
    deflection: { min: 6, max: 10 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 2 },
        { name: 'Flux Crystal', quantity: 1 },
        { name: 'AI Core Fragment', quantity: 1 }
    ],
    description: 'Top-tier containment legs engineered for maximum chemical hazard survival.'
};

