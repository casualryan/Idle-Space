export default {
    name: 'Radiation Lock Mask',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 44, max: 44 },
    healthBonus: { min: 850, max: 1100 },
    defenseTypes: {
        chemicalResistance: { min: 16, max: 20 }
    },
    energyShieldBonus: { min: 50, max: 90 },
    healthRegen: { min: 1.0, max: 1.5 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 1 },
        { name: 'Flux Crystal', quantity: 1 },
        { name: 'Synthetic Biofluid', quantity: 2 }
    ],
    description: 'Radiation-lock mask for late chemical defense with stabilizing barrier support.'
};
