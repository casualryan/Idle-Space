export default {
    name: 'Radiation Lock Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 44, max: 44 },
    healthBonus: { min: 700, max: 900 },
    defenseTypes: {
        chemicalResistance: { min: 14, max: 18 }
    },
    energyShieldBonus: { min: 40, max: 80 },
    healthRegen: { min: 0.8, max: 1.2 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 1 },
        { name: 'Flux Crystal', quantity: 1 },
        { name: 'Synthetic Biofluid', quantity: 2 }
    ],
    description: 'Radiation-lock boots for late chemical defense with a stabilizing barrier.'
};
