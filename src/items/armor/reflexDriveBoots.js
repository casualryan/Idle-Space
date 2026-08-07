export default {
    name: 'Reflex Drive Boots',
    type: 'Armor',
    icon: 'icons/iron_boots.png',
    slot: 'feet',
    levelRequirement: { min: 41, max: 41 },
    healthBonus: { min: 600, max: 750 },
    precision: { min: 8, max: 12 },
    attackSpeedModifier: { min: 4, max: 7 },
    deflection: { min: 4, max: 6 },
    isDisassembleable: true,
    disassembleResults: [
        { name: 'Neural Processor', quantity: 1 },
        { name: 'Quantum Capacitor', quantity: 1 },
        { name: 'Minor Electronic Circuit', quantity: 2 }
    ],
    description: 'Reflex-drive boots built for combat rhythm—quick steps and sharp footing.'
};
