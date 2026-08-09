export default {
    name: 'Biohazard Leg Shells',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 34, max: 34 },
    healthBonus: { min: 520, max: 700 },
    defenseTypes: {
        chemicalResistance: { min: 11, max: 16 }
    },
    healthRegen: { min: 0.6, max: 1.1 },
    deflection: { min: 4, max: 7 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Neural Network Module', quantity: 1 },
        { name: 'High-Density Power Cell', quantity: 1 },
        { name: 'Synthetic Biofluid', quantity: 2 }
    ],
    description: 'Sealed leg shells for contaminated zones—tactical protection without sacrificing stability.'
};
