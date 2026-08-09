export default {
    name: 'Capacitor Crown',
    type: 'Armor',
    icon: 'icons/iron_helmet.png',
    slot: 'head',
    levelRequirement: { min: 12, max: 12 },
    healthBonus: { min: 60, max: 85 },
    energyShieldBonus: { min: 22, max: 40 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 4 },
        { name: 'Wire Bundle', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 1 }
    ],
    description: 'A crown rigged with capacitors that projects a small energy barrier.'
};
