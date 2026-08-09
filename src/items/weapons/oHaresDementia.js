export default {
    name: "O'Hare's Dementia",
    levelRequirement: 35,
    type: "Weapon",
    weaponType: "Shotgun",
    icon: "icons/dementia.png",
    slot: 'mainHand',
    bAttackSpeed: 1.25, // Base Attack Speed
    damageTypes: {
        slashing: { min: 210, max: 270 }
    },
    statModifiers: {
        damageTypes: {
            slashing: { min: 100, max: 125 },
        },
    },
    effects: [
        {
            trigger: 'onHit',
            chance: 100,
            action: 'dealDamage',
            parameters: {
                damageType: 'slashing',
                amount: 200,
                ignoreDefense: true
            }
        }
    ],
    disassembleResults: [
        { name: 'Minor Electronic Circuit', quantity: 1 }, // To Be Changed
        { name: 'Pyro Core', quantity: 1 } // To Be Changed
    ],
    isDisassembleable: true,
    description: "O'Hare was lost. With this, he found himself."
};
