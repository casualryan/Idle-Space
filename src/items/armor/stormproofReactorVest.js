export default {
    name: 'Stormproof Reactor Vest',
    type: 'Armor',
    icon: 'icons/light_armor.png',
    slot: 'chest',
    levelRequirement: { min: 50, max: 50 },
    healthBonus: { min: 1600, max: 1900 },
    defenseTypes: {
        elementalResistance: { min: 30, max: 34 }
    },
    energyShieldBonus: { min: 550, max: 700 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 2 },
        { name: 'Flux Crystal', quantity: 1 },
        { name: 'Neural Network Module', quantity: 1 }
    ],
    description: 'Storm-hardened reactor vest—the pinnacle of elemental chest defense.'
};
