// src/items/weapons/pyroBlaster.js
export default {
        name: "Pyro Blaster",
        type: "Weapon",
        weaponType: "Energy Cannon",
        icon: "icons/pyro_blaster.png",
        level: 10,
        bAttackSpeed: 0.8,
        damageTypes: {
            pyro: { min: 40, max: 55 }
        },
        statModifiers: {
            damageTypes: {
                pyro: { min: 40, max: 50 }
            },
            damageGroups: {
                elemental: { min: 20, max: 25 }
            }
        },
        criticalChanceModifierRange: { min: 15, max: 20 },
        criticalMultiplierModifierRange: { min: 40, max: 60 },
        defenseTypes: {},
        slot: 'mainHand',
        effects: [
            {
                enabled: false,
                trigger: 'onHit',
                chance: 40,
                action: 'areaEffect',
                parameters: {
                    radius: 2,
                    damageType: 'pyro',
                    damageAmount: { min: 15, max: 20 }
                }
            }
        ],
        isDisassembleable: true,
        disassembleResults: [
            { name: 'Pyro Core', quantity: 1 },
            { name: 'Advanced Electronic Circuit', quantity: 2 }
        ],
        description: 'Slow but devastating fire weapon. Its area blast will activate when multi-enemy combat is introduced.'
    };
