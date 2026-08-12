// Combat runtime bootstrap. All rules, state, sequencing, rewards, and rendering live in focused modules.

window.registerCoreboundInitializer(() => {
    assertCombatRegistry(window.enemies || [], window.items || [], window.debuffs || {});
    updatePlayerStatsDisplay();
    initializeEnemyStatsDisplay();
    displayAdventureLocations();
    updateDelveBagUI();
    createShieldPulseAnimation();
    initializeCombatLogPopout();
    setDelveCombatUIActive(Boolean(isDelveInProgress));
});
