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
    delveBag: { items: [], credits: 0 },
    delveClaimCache: { items: [], credits: 0 },
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
