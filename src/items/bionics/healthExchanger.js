export default {
    name: 'Health Exchanger',
    type: 'Bionic',
    icon: 'icons/healthexchanger.png',
    slot: 'bionic',
    healthBonus: { min: -30, max: -10 },
    healthBonusPercentRange : { min: -10, max: -15 },
    energyShieldBonus: { min: 50, max: 60 },
    energyShieldBonusPercentRange: { min: 20, max: 20 },
    isDisassembleable: true,
    disassembleResults: [
        {
            name: 'Scrap Metal', quantity: 1
        },
    ],
    description: 'Decreases Max Health by 10-30, but increases Max Energy Shield by 50-60 + 20%.'
}; 