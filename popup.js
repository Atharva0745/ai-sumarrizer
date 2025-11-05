const summarizeBtn = document.getElementById('summarizeBtn');
const copyBtn = document.getElementById('copyBtn');
const summaryBox = document.getElementById('summaryBox');
const placeholder = document.getElementById('placeholder');
const loading = document.getElementById('loading');
const summaryText = document.getElementById('summaryText');
const summaryType = document.getElementById('summary_type');

summarizeBtn.addEventListener('click', () => {
    summaryBox.classList.add('show');
    placeholder.style.display = 'none';
    summaryText.style.display = 'none';
    loading.style.display = 'flex';
    summarizeBtn.disabled = true;
    copyBtn.disabled = true;

    chrome.storage.sync.get(['geminiApiKey'], ({ geminiApiKey }) => {
        if (!geminiApiKey) {
            summaryText.style.display = 'block';
            summaryText.innerHTML = '<p class="error-message">⚠️ API key not found. Please set it in the extension options.</p>';
            loading.style.display = 'none';
            summarizeBtn.disabled = false;
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_ARTICLE_TEXT' }, async (response) => {
                if (chrome.runtime.lastError || !response || !response.text) {
                    loading.style.display = 'none';
                    summaryText.style.display = 'block';
                    summaryText.innerHTML = '<p class="error-message">⚠️ Failed to fetch article text. Make sure you\'re on an article page.</p>';
                    summarizeBtn.disabled = false;
                    return;
                }
                try {
                    const rawSummary = await geminiSummary(response.text, geminiApiKey, summaryType.value);
                    
                    // Format the summary for better readability
                    const formattedSummary = ResponseFormatter.formatSummary(rawSummary, summaryType.value);
                    
                    summaryText.style.display = 'block';
                    summaryText.innerHTML = formattedSummary;
                    loading.style.display = 'none';
                    copyBtn.disabled = false;
                    summarizeBtn.disabled = false;
                } catch (error) {
                    summaryText.innerHTML = `<p class="error-message">⚠️ Error: ${error.message}</p>`;
                    summaryText.style.display = 'block';
                    loading.style.display = 'none';
                    summarizeBtn.disabled = false;
                }
            });
        });
    });
});

copyBtn.addEventListener('click', async () => {
    try {
        // Get the formatted HTML content
        const htmlContent = summaryText.innerHTML;
        
        // Get plain text version as fallback
        const plainText = ResponseFormatter.extractPlainText(htmlContent);
        
        // Create ClipboardItem with both HTML and plain text
        const clipboardItem = new ClipboardItem({
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'text/plain': new Blob([plainText], { type: 'text/plain' })
        });
        
        // Write to clipboard
        await navigator.clipboard.write([clipboardItem]);
        
        // Show success feedback
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 18px; height: 18px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>Copied!';
        copyBtn.classList.add('btn-success');
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.classList.remove('btn-success');
        }, 2000);
        
    } catch (err) {
        console.error('Failed to copy:', err);
        
        // Fallback to plain text if HTML copy fails
        try {
            const plainText = ResponseFormatter.extractPlainText(summaryText.innerHTML);
            await navigator.clipboard.writeText(plainText);
            
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 18px; height: 18px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>Copied!';
            
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        } catch (fallbackErr) {
            alert('Failed to copy to clipboard');
        }
    }
});
async function geminiSummary(articleText, apiKey, type) {
    const max = 5000;
    const text = articleText.length > max ? articleText.slice(0, max) + "..." : articleText;
    
    const promptMap = {
        brief: `Provide a concise summary (3-4 sentences) of the following article. Focus on the main points:\n\n${text}`,
        detailed: `Provide a comprehensive summary of the following article. Include key details, main arguments, and important context:\n\n${text}`,
        bullet: `Create a bullet-point summary of the following article. Use clear, concise bullet points (use * for bullets). Include the main topic and 5-7 key points:\n\n${text}`
    };
    
    const prompt = promptMap[type] || promptMap['brief'];
    
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }]
        })
    });
    
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || `API Error (${res.status})`);
    }
    
    const data = await res.json();
    
    // Try multiple possible response structures
    if (data.candidates && data.candidates[0]) {
        const candidate = data.candidates[0];
        
        if (candidate.content?.parts?.[0]?.text) {
            return candidate.content.parts[0].text;
        }
        
        if (candidate.parts?.[0]?.text) {
            return candidate.parts[0].text;
        }
        
        if (candidate.text) {
            return candidate.text;
        }
    }
    
    throw new Error('Invalid response format from API');
}