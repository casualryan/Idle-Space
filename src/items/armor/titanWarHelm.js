export default {
    name: 'Titan War Helm',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 46, max: 46 },
    healthBonus: { min: 1200, max: 1450 },
    defenseTypes: {
        physicalResistance: { min: 20, max: 24 }
    },
    deflection: { min: 10, max: 14 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Nanite Cluster', quantity: 2 },
        { name: 'Flux Crystal', quantity: 1 },
        { name: 'Titanium Plating', quantity: 2 }
    ],
    description: 'Titan war helm built to endure overwhelming physical punishment.'
};
