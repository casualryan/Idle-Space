Current Item/Weapon Damage System

Status
- Authoritative reference for the weapon-local damage pipeline.
- Use this with `ITEM_SCHEMA_GUIDE.txt` until older examples are fully refreshed.

Weapon Base (Canonical)
- `weaponBaseDamage: { [damageType]: { min, max } | number }`
- Damage types: `kinetic`, `slashing`, `pyro`, `cryo`, `electric`, `corrosive`, `radiation`
- Legacy compatibility: if `weaponBaseDamage` is missing, legacy weapon `damageTypes` is interpreted as base damage.

Weapon Local Modifiers
- `weaponLocalFlatDamage.{type}`: flat added local weapon damage.
- `weaponLocalTypeIncrease.{type}`: increased local weapon damage by type (% points).
- `weaponLocalGroupIncrease.{group}`: increased local weapon damage by group (% points).
- `weaponDamageConversion`: `{ source, target, percent }` (percent defaults to 100).
- `weaponLocalAttackSpeedPercent`: local increased weapon attack speed (% points).

Damage Groups
- Physical: kinetic, slashing
- Elemental: pyro, cryo, electric
- Chemical: corrosive, radiation

Calculation Order (Implemented)
1) Read `weaponBaseDamage`
2) Apply `weaponLocalFlatDamage`
3) Apply `weaponDamageConversion`
4) Apply local increased modifiers (`weaponLocalTypeIncrease` + `weaponLocalGroupIncrease`)
5) Produce final local weapon damage
6) Export final local weapon damage to the global attack pool once
7) Apply global player modifiers in combat resolution

Attack Speed Order (Implemented)
1) `bAttackSpeed` (weapon base speed)
2) local weapon multiplier from `weaponLocalAttackSpeedPercent`
3) global attack speed bonuses (`attackSpeedModifier`, buffs, passives)

Generator/Drop Rules (Implemented)
- Weapon generation writes `weaponBaseDamage` for weapon items.
- Legacy weapon templates with `damageTypes` are still supported via fallback.
- Generated weapon random modifiers route offensive rolls to local weapon fields:
  - flat damage -> `weaponLocalFlatDamage`
  - type damage % -> `weaponLocalTypeIncrease`
  - group damage % -> `weaponLocalGroupIncrease`
  - attack speed % -> `weaponLocalAttackSpeedPercent`
  - authored conversion effects use `weaponDamageConversion`

Random Affix Structure (Implemented)
- Early items roll 1-2 affixes, midgame items roll 2-3, and late-game items roll
  3-4.
- Affix families prevent duplicate variants of the same concept on one item.
- Armor shares a defensive foundation, with slot identity layered on top:
  head supports precision/critical/status, chest emphasizes Health/Shield, legs
  emphasize sustain/control, feet support cadence, and gloves support offense.
- Bionic bases infer role and damage tags so their four interchangeable slots do
  not draw indiscriminately from every offensive affix.
- Full weapon conversion is not an ordinary random affix. It remains available
  to authored bases, crafted uniques, and special chips.
- Armor Penetration is applied in combat by subtracting percentage points from
  the resistance matching each damage component.

Save/Load Migration (Implemented)
- `saveSchema.js` runs ordered, pure migrations before live state is changed.
- Weapon-like items with only legacy `damageTypes` migrate to `weaponBaseDamage`.
- If both exist, `weaponBaseDamage` wins and the legacy duplicate is removed.
- Generated rolls, rolled modifiers, wires, and socketed chips are normalized in
  place without rerolling them.
- Derived totals are not trusted from the save; the stat/passive pipelines rebuild
  them from the restored equipment and permanent progression state.

Tooltip Rules (Implemented)
- Weapon tooltip includes:
  - Final Weapon Damage
  - Base Weapon Damage
  - Final Attack Speed and Base Attack Speed (when modified)
  - Weapon Modifiers section for local modifier lines

Deprecated Weapon Authoring
- Do not author new weapons with top-level `damageTypes` as primary damage source.
- Use `weaponBaseDamage` for weapon templates and instances.
