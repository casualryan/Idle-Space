export default {
    name: 'Reactive Barbs',
    levelRequirement: 3,
    type: 'Bionic',
    icon: 'icons/reactive_barbs.png',
    slot: 'bionic',
    effects: [
        {
            trigger: 'whenHit',
            chance: 100,
            action: 'dealDamage',
            parameters: {
                damageType: 'kinetic',
                amount: 2,
                ignoreDefense: false
            }
        },
    ],
    isDisassembleable: true,
    disassembleResults: [
        {
            name: 'Scrap Metal', quantity: 1
        },
    ],
    description: 'When hit, deal 2 Kinetic damage to the target.'
};
