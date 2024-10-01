'use strict';

import './popup.css';
import Browser from "webextension-polyfill";
// Save API key and personal information to local storage
const saveBtn = document.getElementById('saveBtn');
const apiKeyInput = document.getElementById('apiKey');
const personalInfoInput = document.getElementById('personalInfo');

const init = async () => {
    const storage = await Browser.storage.local.get(['api_key', 'personal_info']);
    apiKeyInput.value = storage.api_key || '';
    personalInfoInput.value = storage.personal_info || '';
}

init();

saveBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value;
    const personalInfo = personalInfoInput.value;

    try {
        await Browser.storage.local.set({ api_key: apiKey, personal_info: personalInfo });
        const indicator = document.getElementById('saved-indicator');
        indicator.style.display = 'block';
        saveBtn.style.display = 'none';
        setTimeout(() => {
            indicator.style.display = 'none';
            saveBtn.style.display = 'block';
        }, 2000);
    } catch (error) {
        alert('Error saving to local storage: ' + error);
    }
});

