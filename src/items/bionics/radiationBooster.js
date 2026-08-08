export default {
    name: 'Radiation Booster',
    levelRequirement: 1,
    type: 'Bionic',
    icon: 'icons/radiation_booster.png',
    slot: 'bionic',
    statModifiers: {
        damageTypes: {
            radiation: { min: 10, max: 18 },
        },
    },
    isDisassembleable: true,
    disassembleResults: [
        {
            name: 'Scrap Metal', quantity: 1
        },
    ],
    description: 'Increases Radiation Damage Multiplier.'
};
