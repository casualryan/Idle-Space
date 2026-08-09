export default {
  name: "Scrap Maul",
  type: "Weapon",
  weaponType: "Maul",
  icon: "icons/scrap_maul.png",
  slot: "mainHand",
  levelRequirement: { min: 5, max: 5 },
  bAttackSpeed: { min: 0.75, max: 0.85 },
  damageTypes: {
    kinetic: { min: 20, max: 28 }
  },
  isDisassembleable: true,
  disassembleResults: [
    { name: "Scrap Metal", quantity: 2 },
    { name: "Wire Bundle", quantity: 1 }
  ],
  description: "A heavy early kinetic maul scavenged from industrial scrap."
};

