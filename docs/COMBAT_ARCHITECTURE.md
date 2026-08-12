# Combat Runtime Architecture

The combat runtime remains classic-script compatible, but it no longer has a single file that owns every concern. `src/runtimeScripts.js` is the authoritative dependency order.

## Ownership

| File | Owns | Must not own |
| --- | --- | --- |
| `combatSchema.js` | Combatant references, damage packets, applied-damage results, content contracts, normalization, and validation | Balance formulas, state mutation, DOM rendering |
| `combatState.js` | Canonical mutable combat/delve state and legacy global accessors | Rules, timers, DOM rendering |
| `combatController.js` | Combat lifecycle, per-enemy timers, group creation, targeting, taunts, encounter transitions | Direct DOM access, damage formulas |
| `combatEffects.js` | Effects, damage application, healing, regeneration, buff cleanup | Encounter sequencing, DOM rendering |
| `combatResolution.js` | Player/enemy attacks, criticals, hit hooks, combo resolution | Delve rewards, DOM rendering |
| `delveRewards.js` | Temporary loot, claim-cache mutations, XP and loot handoff | DOM rendering, encounter selection |
| `delveManager.js` | Delve start, visibility progression, completion, next-enemy selection | DOM rendering, damage rules |
| `combatUI.js` | Compact player/enemy cards, formation, bars, drawers, log, animations, UI adapters | Combat decisions or state transitions |
| `delveUI.js` | Location terminal, drawer-mounted delve bag, claim-cache rendering | Reward calculation or encounter rules |
| `combat.js` | One-time bootstrap calls only | Subsystem behavior |

## Dependency direction

The combat and save schemas load before stat calculation. State loads before controllers. The cross-registry content schema loads after authored registries and before bootstrap validation. Controllers and rules may call rendering adapters, but they never access `document` directly. Reward and delve sequence modules are independent of their renderers. The UI modules load before the bootstrap, and `combat.js` starts the initial render only after every dependency exists.

The state object is available as `window.coreboundCombatState`. `encounterEnemies` is the authoritative live group and remains separate from `window.enemies`, the authored content registry. The legacy `enemy` accessor mirrors the player's selected target. `selectedEnemyId` preserves player intent and `tauntOverride` separately records a temporary forced destination. The remaining property accessors preserve existing unqualified names such as `isCombatActive` and `delveBag`; this compatibility layer allows incremental ES-module conversion without changing save behavior.

## Group encounter rules

An encounter contains one to six independent enemy instances. Spawn order maps to top-center, top-left, top-right, bottom-center, bottom-left, and bottom-right. Default targeting uses the living card farthest to the left; clicking a card updates `selectedEnemyId`. Shield and heavy archetypes may activate a timed taunt. A taunt changes only `getEffectivePlayerTarget()`, leaving the selected ID intact so the prior target resumes automatically.

Every living enemy owns an attack timer and processes its own buffs and debuffs. The encounter advances only after the final living enemy is defeated. Rewards use `_rewardScale = 1 / groupSize`: XP is integer-allocated across the group without losing points to per-kill rounding, while loot and currency preserve the prior encounter's expected drop budget. Each defeated combatant still resolves its share independently.

## Authoritative combat contracts

Every active combatant is normalized through `createCombatantReference()`. It provides one stable view of identity, resources, offense, defenses, and active effects while retaining the underlying runtime entity reference.

Every resolved hit is a `corebound.damage-packet@1` containing an explicit source, target, typed damage map, total, critical state, roll, tags, and behavioral flags. `applyDamage()` consumes that packet and returns a `corebound.damage-result@1` containing shield damage, health damage, overkill, resource values before/after, and defeat state.

The legacy positional `applyDamage(target, amount, name, damageTypes)` signature is an adapter only. New runtime code must create and pass a damage packet. Explicit actors keep multi-enemy attacks independent from the selected-target compatibility accessor.

Authored enemies, portraits, taunts, debuffs, and item-triggered effects are validated during bootstrap. Runtime combatants and packets are validated at their entry points, so unknown damage/resistance keys, invalid taunt timing, unknown triggers/actions, broken debuff references, reserved live actions, and incomplete entities fail with a useful error instead of producing disconnected mechanics. Disabled `areaEffect` content remains a documented reservation and cannot be enabled until the action has an executor.

## Change rules

- Put a new combat mechanic in the narrowest rule owner, never in a renderer or bootstrap.
- Pass damage through `createDamagePacket()`; do not introduce another hit-result shape.
- Include explicit source and target combatants on every packet.
- Add mutable combat/delve state to `combatState.js`; do not create a second top-level owner.
- Put all DOM work behind `combatUI.js` or `delveUI.js` functions.
- Preserve `RUNTIME_SCRIPTS` order unless a dependency is deliberately changed.
- Run `npm test`, `npm run build`, and `npm run balance` after combat changes.

Repository tests enforce dependency order, single function ownership, DOM-free logic modules, and a minimal bootstrap.
