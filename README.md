# Corebound: Synthetic Dominion

Corebound is a browser-based combat and progression game built with Vite. The
current repair pass keeps the existing gameplay while making runtime order,
content registration, saves, and validation explicit.

## Run the game

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Production output can be checked with:

```bash
npm run validate
npm run preview
```

`npm run validate` runs repository integrity tests and then creates a production
build in `dist/`.

## Developer mode

Add `?dev=1` to the game URL, for example:

```text
http://localhost:5173/?dev=1
```

Developer mode persists across reloads. It exposes the Testing Grounds, Big
Bertha, test-only equipment and shops, and developer tools. Visit the URL with
`?dev=0` to disable it again.

## Runtime architecture

- `src/main.js` is the Vite entry point. It registers modular items and enemies,
  applies the developer-mode content filter, and starts the classic runtime.
- `src/runtimeScripts.js` is the single authoritative load order for the classic
  scripts that have not yet been migrated to modules.
- `saveSchema.js` owns the current save version, ordered migrations, and snapshot
  validation. Derived combat stats and gear-granted passive totals are rebuilt
  from authoritative player/equipment state after load.
- `contentSchema.js` validates cross-registry references and authored stat keys at
  startup, so typos and disconnected content fail with a useful message.
- `src/items/` contains one module per item and category index files.
- `src/enemies/` contains enemy templates and their category index.
- Root-level runtime files contain the remaining game systems, including combat,
  gathering, fabrication, saves, shops, locations, loot, and the Codex.
- `tests/` checks content references, load-order collisions, and gameplay data
  contracts so disconnected content fails loudly during development.

## Adding content

Create the item or enemy in its matching `src/` folder, then import and register
it in that folder's `index.js`. Equipment needs a positive numeric
`levelRequirement` (a numeric range is also valid for generated equipment).
Enemy rewards must use `lootConfig` and named pools from `lootPools.js`; even a
single unique boss reward belongs in a weighted loot table.

Item scalar bonuses are an explicit schema, not arbitrary object properties. Add
new live stats to `ITEM_SCALAR_STAT_RULES` in `stats.js` and their validation
coverage before authoring them on content. `armorPenetration` remains reserved and
will produce a warning until combat resolution implements it.

Effect `chance` values are authored as percentages (`25` means 25%). Ordinary
base equipment should differ through its core stats, not bespoke effects, unless
the item is intentionally designed as a unique.

The in-game Codex builds its enemy, debuff, and loot information from the live
registries. Keep those registries authoritative instead of duplicating their
facts in UI copy.

## Current gameplay contracts

- New characters receive a Broken Phase Sword and 1,000 credits.
- Only Balanced Style is exposed until additional combat styles have distinct,
  authored trees.
- Fabrication reserves materials immediately, takes five seconds, allows one
  active job, and refunds the reservation when cancelled.
- Successful delve rewards enter a persistent claim cache. Starting another
  delve destroys anything left there; auto re-deploy waits for the cache to be
  claimed or sold.
- Recipes are all available during the current baseline. A future blueprint
  progression system will permanently teach a recipe when its blueprint is
  read; learned recipes will remain reusable without consuming the blueprint.
