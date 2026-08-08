# Combat Runtime Architecture

The combat runtime remains classic-script compatible, but it no longer has a single file that owns every concern. `src/runtimeScripts.js` is the authoritative dependency order.

## Ownership

| File | Owns | Must not own |
| --- | --- | --- |
| `combatState.js` | Canonical mutable combat/delve state and legacy global accessors | Rules, timers, DOM rendering |
| `combatController.js` | Combat lifecycle, timers, enemy creation, encounter transitions | Direct DOM access, damage formulas |
| `combatEffects.js` | Effects, damage application, healing, regeneration, buff cleanup | Encounter sequencing, DOM rendering |
| `combatResolution.js` | Player/enemy attacks, criticals, hit hooks, combo resolution | Delve rewards, DOM rendering |
| `delveRewards.js` | Temporary loot, claim-cache mutations, XP and loot handoff | DOM rendering, encounter selection |
| `delveManager.js` | Delve start, visibility progression, completion, next-enemy selection | DOM rendering, damage rules |
| `combatUI.js` | Combat dashboard, bars, log, animations, UI adapters | Combat decisions or state transitions |
| `delveUI.js` | Location terminal, delve bag, claim-cache rendering | Reward calculation or encounter rules |
| `combat.js` | One-time bootstrap calls only | Subsystem behavior |

## Dependency direction

State loads first. Controllers and rules may call rendering adapters, but they never access `document` directly. Reward and delve sequence modules are independent of their renderers. The UI modules load before the bootstrap, and `combat.js` starts the initial render only after every dependency exists.

The state object is available as `window.coreboundCombatState`. Its property accessors preserve the existing unqualified names such as `enemy`, `isCombatActive`, and `delveBag`; this compatibility layer allows incremental ES-module conversion without changing save behavior or game mechanics.

## Change rules

- Put a new combat mechanic in the narrowest rule owner, never in a renderer or bootstrap.
- Add mutable combat/delve state to `combatState.js`; do not create a second top-level owner.
- Put all DOM work behind `combatUI.js` or `delveUI.js` functions.
- Preserve `RUNTIME_SCRIPTS` order unless a dependency is deliberately changed.
- Run `npm test`, `npm run build`, and `npm run balance` after combat changes.

Repository tests enforce dependency order, single function ownership, DOM-free logic modules, and a minimal bootstrap.
