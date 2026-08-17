// Shared mutable state for combat and delve runtime subsystems. Compatibility
// accessors preserve the legacy global names while keeping one authoritative
// state object for saves, tests, and future module conversion.
const combatState = {
    currentLocation: null,
    enemy: null,
    encounterEnemies: [],
    selectedEnemyId: null,
    tauntOverride: null,
    encounterSerial: 0,
    combatInterval: null,
    playerAttackTimer: 0,
    enemyAttackTimer: 0,
    enemyAttackTimers: {},
    playerHasFled: false,
    combatRestartTimeout: null,
    isCombatActive: false,
    lastCombatLoopTime: null,
    adventureStartCountdownInterval: null,
    healthRegenInterval: null,
    playerNextAttackTime: 0,
    enemyNextAttackTime: 0,
    enemyNextAttackTimes: {},
    isDelveInProgress: false,
    currentDelveLocation: null,
    currentMonsterIndex: 0,
    interFightPauseTimer: null,
    delveBag: { items: [], feed: 0 },
    delveClaimCache: { items: [], feed: 0 },
    currentRunMode: null,
    operationState: null,
    operationBoard: { version: 3, generation: 0, playerLevel: 1, offers: [] },
    deepSectorProgress: { intel: 0, highestUnlockedLevel: 55, selectedLevel: 55, shop: { cache: 0, flux: 0, material: 0, feed: 0 } },
    completedOperationSeeds: [],
    completedOperationCount: 0,
    completedDelveLocations: {}
};

for (const key of Object.keys(combatState)) {
    Object.defineProperty(window, key, {
        configurable: true,
        enumerable: false,
        get: () => combatState[key],
        set: value => { combatState[key] = value; }
    });
}

window.coreboundCombatState = combatState;
