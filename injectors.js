const injectors = [
    {
        name: 'Mining Booster Injector',
        icon: 'icons/mining_booster_injector.png',
        effect: {
            type: 'buff',
            stat: 'miningSpeed',
            amount: 0.5, // +50% mining speed
            duration: 60000, // Duration in milliseconds (e.g., 1 minute)
        },
        requiredMaterials: [
            { name: 'Electronic Circuit', quantity: 1 },
            { name: 'Chemical Solution', quantity: 1 },
        ],
    },
    {
        name: 'Combat Accelerator Injector',
        icon: 'icons/combat_accelerator_injector.png',
        effect: {
            type: 'buff',
            stat: 'attackSpeed',
            amount: 0.25, // +25% attack speed
            duration: 60000,
        },
        requiredMaterials: [
            { name: 'Electronic Circuit', quantity: 1 },
            { name: 'Energy Cell', quantity: 1 },
        ],
    },
    // Add more injectors as needed
];
