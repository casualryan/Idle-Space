export default {
    name: 'Radiation Lock Legguards',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 44, max: 44 },
    healthBonus: { min: 950, max: 1250 },
    defenseTypes: {
        chemicalResistance: { min: 16, max: 22 }
    },
    energyShieldBonus: { min: 60, max: 120 },
    healthRegen: { min: 1.0, max: 1.7 },
    deflection: { min: 6, max: 10 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 1 },
        { name: 'Flux Crystal', quantity: 1 },
        { name: 'Synthetic Biofluid', quantity: 2 }
    ],
    description: 'Lock-sealed legguards for hazardous zones, pairing chemical protection with stable footing.'
};

