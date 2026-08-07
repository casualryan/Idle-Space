export default {
    name: 'Slashing Booster',
    type: 'Bionic',
    icon: 'icons/slashing_booster.png',
    slot: 'bionic',
    statModifiers: {
        damageTypes: {
            slashing: { min: 10, max: 18 },
        },
    },
    isDisassembleable: true,
    disassembleResults: [
        {
            name: 'Scrap Metal', quantity: 1
        },
    ],
    description: 'Increases Slashing Damage Multiplier.'
}; 