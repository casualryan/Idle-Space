export default {
    name: 'Capacitor Harness',
    type: 'Armor',
    icon: 'icons/light_armor.png',
    slot: 'chest',
    levelRequirement: { min: 10, max: 10 },
    healthBonus: { min: 85, max: 120 },
    energyShieldBonus: { min: 15, max: 40 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 4 },
        { name: 'Wire Bundle', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 1 }
    ],
    description: 'A chest harness wired with capacitors that bleed damage into an energy shield.'
};
