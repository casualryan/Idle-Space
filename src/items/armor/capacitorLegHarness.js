export default {
    name: 'Capacitor Leg Harness',
    type: 'Armor',
    icon: 'icons/iron_pants.png',
    slot: 'legs',
    levelRequirement: { min: 11, max: 11 },
    healthBonus: { min: 80, max: 110 },
    energyShieldBonus: { min: 25, max: 45 },
    deflection: { min: 1, max: 2 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Scrap Metal', quantity: 4 },
        { name: 'Wire Bundle', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 1 }
    ],
    description: 'A leg harness with compact capacitors that reinforce your stride with a small energy shield.'
};

