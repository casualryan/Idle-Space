export default {
    name: 'Kinetic Booster',
    levelRequirement: 1,
    type: 'Bionic',
    icon: 'icons/kinetic_booster.png',
    slot: 'bionic',
    statModifiers: {
        damageTypes: {
            kinetic: { min: 10, max: 18 },
        },
    },
    isDisassembleable: true,
    disassembleResults: [
        {
            name: 'Scrap Metal', quantity: 1
        },
    ],
    description: 'Increases Kinetic Damage Multiplier.'
};
