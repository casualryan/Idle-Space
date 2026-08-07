export default {
  name: "Cracked Heat Pistol",
  type: "Weapon",
  weaponType: "Pistol",
  icon: "icons/default-icon.png",
  slot: "mainHand",
  levelRequirement: { min: 2, max: 2 },
  bAttackSpeed: { min: 0.95, max: 1.05 },
  damageTypes: {
    pyro: { min: 8, max: 12 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Scrap Metal", quantity: 2 },
    { name: "Wire Bundle", quantity: 1 }
  ],
  description: "A cracked heat pistol that still spits usable pyro pulses."
};

