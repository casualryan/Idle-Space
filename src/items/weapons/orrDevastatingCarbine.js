// src/items/weapons/orrDevastatingCarbine.js
export default {
        name: "Orr, Devastating Carbine",
        type: "Weapon",
        weaponType: "Rifle",
        icon: "icons/orr.png",
        level: 40,
        bAttackSpeed: .8,
        damageTypes: {
            kinetic: { min: 240, max: 280 },
        },
        statModifiers: {
            damageTypes: {
                kinetic: { min: 100, max: 125 },
            },
        },
        attackSpeedModifierRange: { min: 20, max: 20},
        criticalChanceModifierRange: { min: 60, max: 70},
        criticalMultiplierModifierRange: { min: 40, max: 50},
        defenseTypes: {},
        slot: 'mainHand',
        effects: [
            {
                trigger: 'onHit',
                chance: 33,
                action: 'dealDamage',
                parameters: {
                    damageType: 'kinetic',
                    amount: 200,
                    ignoreDefense: true
                }
            }
        ],
        wires: {
            totalSlots: "0-2",
            blackSlotsMax: 1,
            colors: { red: "1-2", green: "1-2", blue: "1-2", black: "1-1" }
        },
        isDisassembleable: true,
        disassembleResults: [
            { name: 'Advanced Alloy', quantity: 1 }
        ],
    };
