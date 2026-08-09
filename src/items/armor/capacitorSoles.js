export default {
    name: 'Capacitor Soles',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 12, max: 12 },
    healthBonus: { min: 55, max: 75 },
    energyShieldBonus: { min: 18, max: 35 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 4 },
        { name: 'Wire Bundle', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 1 }
    ],
    description: 'Capacitor-lined soles that add a small energy barrier with each step.'
};
