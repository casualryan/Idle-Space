export default {
    name: 'Chemical Booster',
    type: 'Bionic',
    icon: 'icons/chemical_booster.png',
    slot: 'bionic',
    statModifiers: {
        damageTypes: {
            chemical: { min: 10, max: 18 },
        },
    },
    isDisassembleable: true,
    disassembleResults: [
        {
            name: 'Scrap Metal', quantity: 1
        },
    ],
    description: 'Increases Chemical Damage Multiplier.'
}; 