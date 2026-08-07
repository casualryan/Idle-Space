export default {
    name: 'Titan-Stomp Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 46, max: 46 },
    healthBonus: { min: 900, max: 1100 },
    defenseTypes: {
        physicalResistance: { min: 16, max: 20 }
    },
    deflection: { min: 8, max: 12 },
    attackSpeedModifier: { min: -3, max: -1 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 2 },
        { name: 'Flux Crystal', quantity: 1 },
        { name: 'Titanium Plating', quantity: 1 }
    ],
    description: 'Titan-stomp boots that anchor you through overwhelming physical force.'
};
