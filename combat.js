// Combat runtime bootstrap. All rules, state, sequencing, rewards, and rendering live in focused modules.

window.registerCoreboundInitializer(() => {
    updatePlayerStatsDisplay();
    initializeEnemyStatsDisplay();
    displayAdventureLocations();
    updateDelveBagUI();
    createShieldPulseAnimation();
    initializeCombatLogPopout();
});
