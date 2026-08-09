const buffs = [
    {
        name: "Haste",
        description: "Increases your attack speed.",
        type: "buff",
        statChanges: {
            attackSpeed: 2, 
        },
        duration: 60000 
    },
    {
        name: "Sharpen",
        description: "Increases kinetic damage.",
        type: "buff",
        statChanges: {
            damageTypes: {
                kinetic: 5
            }
        },
        duration: 60000 
    },
    {
        name: "Cracked",
        description: "Lose resistances.",
        type: "buff",
        statChanges: {
            defenseTypes: {
                elementalResistance: -30,
                chemicalResistance: -30,
                physicalResistance: -30
            }
        },
        duration: 999999 
    }
];
