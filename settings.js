// Settings modal open/close (main wiring lives in global.js)

document.addEventListener('DOMContentLoaded', () => {
    const settingsButton = document.getElementById('settings-button');
    const settingsMenu = document.getElementById('settings-menu');
    const closeSettings = document.getElementById('close-settings');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    if (settingsButton && settingsMenu && typeof openSettingsMenu === 'function') {
        settingsButton.addEventListener('click', () => {
            openSettingsMenu();
        });
    }

    if (closeSettings && typeof closeSettingsMenu === 'function') {
        closeSettings.addEventListener('click', () => {
            closeSettingsMenu();
        });
    }

    if (settingsMenu) {
        window.addEventListener('click', (event) => {
            if (event.target === settingsMenu && typeof closeSettingsMenu === 'function') {
                closeSettingsMenu();
            }
        });
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', (event) => {
            if (event.target.checked) {
                enableDarkMode();
            } else {
                disableDarkMode();
            }
        });

        const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
        darkModeToggle.checked = darkModeEnabled;
        if (darkModeEnabled) {
            enableDarkMode();
        }
    }
});
