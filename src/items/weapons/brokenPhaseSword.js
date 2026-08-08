// src/items/weapons/brokenPhaseSword.js
export default {
        name: "Broken Phase Sword",
        levelRequirement: 1,
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
        description: 'A damaged phase blade kept functional through improvised repairs.'
    };
