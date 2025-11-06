document.addEventListener('DOMContentLoaded', () => {
    // Load saved API key on page load
    chrome.storage.sync.get(['geminiApiKey'], ({ geminiApiKey }) => {
        if (geminiApiKey) {
            document.getElementById('apiKeyInput').value = geminiApiKey;
        }
    });
});

document.getElementById('saveBtn').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    
    // Validate that API key is not empty
    if (!apiKey) {
        alert('Please enter an API key');
        return;
    }

    // Save API key to Chrome storage
    chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
        // Show success message
        const successMsg = document.getElementById('successMessage');
        if (successMsg) {
            successMsg.classList.add('show');
            
            // Hide success message after 3 seconds
            setTimeout(() => {
                successMsg.classList.remove('show');
                window.close();
            }, 1000);
        }
    });
});