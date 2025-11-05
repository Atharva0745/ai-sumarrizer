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
            summaryText.innerText = 'API key not found. Please set it in the extension options.';
            loading.style.display = 'none';
            summarizeBtn.disabled = false;
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_ARTICLE_TEXT' }, async (response) => {
                if (chrome.runtime.lastError || !response || !response.text) {
                    loading.style.display = 'none';
                    summaryText.style.display = 'block';
                    summaryText.innerText = 'Failed to fetch article text.';
                    summarizeBtn.disabled = false;
                    return;
                }
                try {
                    const summary = await geminiSummary(response.text, geminiApiKey, summaryType.value);
                    summaryText.style.display = 'block';
                    
                    // Format bullet points as HTML
                    if (summaryType.value === 'bullet') {
                        // Split by actual newlines and filter empty lines
                        const lines = summary.split(/\r?\n/).filter(line => line.trim());
                        
                        const htmlContent = lines
                            .map(line => {
                                line = line.trim();
                                // Match lines starting with *, -, or •
                                if (line.match(/^[\*\-•]\s+/)) {
                                    return `<li>${line.replace(/^[\*\-•]\s+/, '')}</li>`;
                                }
                                // Match numbered lists like "1. " or "1) "
                                else if (line.match(/^\d+[\.\)]\s+/)) {
                                    return `<li>${line.replace(/^\d+[\.\)]\s+/, '')}</li>`;
                                }
                                // Keep other non-empty lines as paragraphs
                                else if (line) {
                                    return `<p style="margin: 8px 0; font-weight: 500;">${line}</p>`;
                                }
                                return '';
                            })
                            .filter(line => line)
                            .join('');
                        
                        summaryText.innerHTML = `<ul style="margin: 0; padding-left: 20px; list-style-type: disc;">${htmlContent}</ul>`;
                    } else {
                        // For brief/detailed, preserve line breaks
                        summaryText.style.whiteSpace = 'pre-wrap';
                        summaryText.innerText = summary;
                    }
                    
                    loading.style.display = 'none';
                    copyBtn.disabled = false;
                    summarizeBtn.disabled = false;
                } catch (error) {
                    summaryText.innerText = 'Error generating summary: ' + error.message;
                    summaryText.style.display = 'block';
                    loading.style.display = 'none';
                    summarizeBtn.disabled = false;
                }
            });
        });
    });
});

copyBtn.addEventListener('click', () => {
    const text = summaryText.innerText;
    navigator.clipboard.writeText(text).then(() => {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 18px; height: 18px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>Copied!';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
    });
});

async function geminiSummary(articleText, apiKey, type) {
    const max = 5000;
    const text = articleText.length > max ? articleText.slice(0, max) + "..." : articleText;
    const promptMap = {
        brief: `Provide a brief summary of the following article:\n\n${text}`,
        detailed: `Provide a detailed summary of the following article:\n\n${text}`,
        bullet: `Provide a  bullet-point summary of the following article. Use * as bullet points:\n\n${text}`
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
        throw new Error(errorData.error?.message || 'Request failed');
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
    
    throw new Error('Unexpected API response structure');
}