// src/items/weapons/brokenPoisonPistol.js
export default {
        name: "Broken Poison Pistol",
        levelRequirement: 1,
        type: "Weapon",
        weaponType: "Pistol",
        icon: "icons/poison_pistol.png",
        damageTypes: {
            chemical: { min: 3, max: 6 },
        },
        defenseTypes: {},
        slot: 'mainHand',
        disassembleResults: [
            { name: 'Minor Electronic Circuit', quantity: 1 },
            { name: 'Scrap Metal', quantity: 1 },
            { name: 'Synthetic Poison Gland', quantity: 1 }
        ],
        isDisassembleable: true,
    };
