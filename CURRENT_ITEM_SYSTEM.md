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
  - conversions use `weaponDamageConversion`

Save/Load Migration (Implemented)
- On item restore:
  - weapon-like items with only legacy `damageTypes` get migrated to `weaponBaseDamage`.
  - if both exist, `weaponBaseDamage` is preferred and legacy `damageTypes` is ignored to prevent duplicate base application.

Tooltip Rules (Implemented)
- Weapon tooltip includes:
  - Final Weapon Damage
  - Base Weapon Damage
  - Final Attack Speed and Base Attack Speed (when modified)
  - Weapon Modifiers section for local modifier lines

Deprecated Weapon Authoring
- Do not author new weapons with top-level `damageTypes` as primary damage source.
- Use `weaponBaseDamage` for weapon templates and instances.
