document.addEventListener('DOMContentLoaded', () => {
    const enabledCheckbox = document.getElementById('enabled-checkbox');
    const allowedEmojisTextarea = document.getElementById('allowed-emojis');
    const saveButton = document.getElementById('save-button');
    const saveStatus = document.getElementById('save-status');

    // Load current settings from storage
    browser.storage.local.get(['isEnabled', 'allowedEmojis']).then(result => {
        enabledCheckbox.checked = !!result.isEnabled;
        allowedEmojisTextarea.value = result.allowedEmojis || '';
    });

    // Handle toggle switch changes
    enabledCheckbox.addEventListener('change', () => {
        const isEnabled = enabledCheckbox.checked;
        browser.storage.local.set({ isEnabled }).then(() => {
            browser.runtime.sendMessage({
                action: 'updateState',
                isEnabled: isEnabled
            });
        });
    });

    // Handle save button click for the allow-list
    saveButton.addEventListener('click', () => {
        const allowedEmojis = allowedEmojisTextarea.value;
        browser.storage.local.set({ allowedEmojis }).then(() => {
            browser.runtime.sendMessage({
                action: 'updateState',
                allowedEmojis: allowedEmojis
            });
            saveStatus.textContent = 'Saved!';
            setTimeout(() => {
                saveStatus.textContent = '';
            }, 2000);
        });
    });
});