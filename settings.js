// global.js or settings.js

document.addEventListener('DOMContentLoaded', () => {
    // Settings Menu Elements
    const settingsButton = document.getElementById('settings-button');
    const settingsMenu = document.getElementById('settings-menu');
    const closeSettings = document.getElementById('close-settings');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    // Event Listeners
    settingsButton.addEventListener('click', () => {
        settingsMenu.style.display = 'block';
    });

    closeSettings.addEventListener('click', () => {
        settingsMenu.style.display = 'none';
    });

    // Close the modal if the user clicks outside of it
    window.addEventListener('click', (event) => {
        if (event.target === settingsMenu) {
            settingsMenu.style.display = 'none';
        }
    });

    // Dark Mode Toggle
    darkModeToggle.addEventListener('change', (event) => {
        if (event.target.checked) {
            enableDarkMode();
        } else {
            disableDarkMode();
        }
    });

    // Load dark mode preference from localStorage
    const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
    darkModeToggle.checked = darkModeEnabled;
    if (darkModeEnabled) {
        enableDarkMode();
    }
});