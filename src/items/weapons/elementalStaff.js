// src/items/weapons/elementalStaff.js
export default {
        name: 'Elemental Staff',
        levelRequirement: 5,
        type: "Weapon",
        weaponType: "Staff",
        icon: "icons/staff.png",
        bAttackSpeed: 1.5,
        damageTypes: {
            pyro: { min: 10, max: 15 },
            electric: { min: 5, max: 10 }
        },
        statModifiers: {
            damageTypes: {
                pyro: { min: 5, max: 10 },
                cryo: { min: 5, max: 10 },
                electric: { min: 5, max: 10 }
            },
            damageGroups: {
                elemental: { min: 20, max: 30 } // Group modifier for all elemental damage
            }
        },
        criticalChanceModifierRange: { min: 10, max: 15 },
        criticalMultiplierModifierRange: { min: 20, max: 30 },
        defenseTypes: {},
        slot: 'mainHand',
        disassembleResults: [
            { name: 'Scrap Metal', quantity: 2 },
            { name: 'Flux Crystal', quantity: 1 }
        ],
        isDisassembleable: true,
        description: 'A staff that channels elemental energy. Increases all elemental damage.'
    };
