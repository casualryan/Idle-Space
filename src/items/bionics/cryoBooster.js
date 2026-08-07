export default {
    name: 'Cryo Booster',
    type: 'Bionic',
    icon: 'icons/cryo_booster.png',
    slot: 'bionic',
    statModifiers: {
        damageTypes: {
            cryo: { min: 10, max: 18 },
        },
    },
    isDisassembleable: true,
    disassembleResults: [
        {
            name: 'Scrap Metal', quantity: 1
        },
    ],
    description: 'Increases Cryo Damage Multiplier.'
}; 