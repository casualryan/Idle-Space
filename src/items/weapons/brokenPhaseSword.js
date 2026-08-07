// src/items/weapons/brokenPhaseSword.js
export default {
        name: "Broken Phase Sword",
        type: "Weapon",
        weaponType: "Sword",
        icon: "icons/broken_phase_sword.png",
        bAttackSpeed: .75,
        damageTypes: {
            kinetic: { min: 6, max: 6 },
        },
        defenseTypes: {},
        slot: 'mainHand',
        disassembleResults: [
            {
                name: 'Scrap Metal', quantity: 1
            },
        ],
        isDisassembleable: true,
        effects: [
            {
                trigger: 'onHit',
                chance: .2, // 20% chance
                action: 'dealDamage',
                parameters: {
                    damageType: 'kinetic',
                    amount: 5,
                    ignoreDefense: true
                }
            }
        ],
        description: '20% chance on hit to deal 5 kinetic damage, ignoring defense. Adds bonus physical damage.'
    };