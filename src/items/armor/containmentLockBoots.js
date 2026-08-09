export default {
    name: 'Containment Lock Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 50, max: 50 },
    healthBonus: { min: 950, max: 1150 },
    defenseTypes: {
        chemicalResistance: { min: 18, max: 22 }
    },
    healthRegen: { min: 1.4, max: 2.0 },
    deflection: { min: 4, max: 7 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 2 },
        { name: 'Flux Crystal', quantity: 1 },
        { name: 'AI Core Fragment', quantity: 1 }
    ],
    description: 'Containment-lock boots—the pinnacle of chemical hazard footing protection.'
};
