// src/items/weapons/fireSpewerMk1.js
export default {
        name: "Fire Spewer Mk1",
        levelRequirement: 10,
        type: "Weapon",
        weaponType: "Pistol",
        icon: "icons/flame_thrower.png",
        slot: 'mainHand',
        bAttackSpeed: 4,
        damageTypes: {
            pyro: { min: 17, max: 25 },
        },
        statModifiers: {
            damageTypes: {
                pyro: { min: 40, max: 45 },
            },
        },
        defenseTypes: {},
        disassembleResults: [
            { name: 'Flame Shell', quantity: 1 },
            { name: 'Pyro Core', quantity: 1 }
        ],
        isDisassembleable: true,
        description: 'Rapidly spews fire at enemies, dealing Pyro damage.'
    };
