export default {
    name: 'Radiation Lock Harness',
    type: 'Armor',
    icon: 'icons/light_armor.png',
    slot: 'chest',
    levelRequirement: { min: 43, max: 43 },
    healthBonus: { min: 1200, max: 1400 },
    defenseTypes: {
        chemicalResistance: { min: 22, max: 26 }
    },
    energyShieldBonus: { min: 80, max: 120 },
    healthRegen: { min: 1.2, max: 1.8 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 1 },
        { name: 'Flux Crystal', quantity: 1 },
        { name: 'Synthetic Biofluid', quantity: 2 }
    ],
    description: 'Radiation-lock seals and biofilters for the deadliest chemical battlefields.'
};
