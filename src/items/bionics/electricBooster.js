export default {
    name: 'Electric Booster',
    type: 'Bionic',
    icon: 'icons/electric_booster.png',
    slot: 'bionic',
    statModifiers: {
        damageTypes: {
            electric: { min: 10, max: 18 },
        },
    },
    isDisassembleable: true,
    disassembleResults: [
        {
            name: 'Scrap Metal', quantity: 1
        },
    ],
    description: 'Increases Electric Damage Multiplier.'
}; 