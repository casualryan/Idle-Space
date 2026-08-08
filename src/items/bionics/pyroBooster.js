export default {
    name: 'Pyro Booster',
    levelRequirement: 1,
    type: 'Bionic',
    icon: 'icons/pyro_booster.png',
    slot: 'bionic',
    statModifiers: {
        damageTypes: {
            pyro: { min: 10, max: 18 },
        },
    },
    isDisassembleable: true,
    disassembleResults: [
        {
            name: 'Scrap Metal', quantity: 1
        },
    ],
    description: 'Increases Pyro Damage Multiplier.'
};
