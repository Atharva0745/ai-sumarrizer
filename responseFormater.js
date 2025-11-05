// Formatter utility for AI responses
const ResponseFormatter = {
    // Format the summary based on type
    formatSummary(text, type) {
        if (type === 'bullet') {
            return this.formatBulletPoints(text);
        } else {
            return this.formatParagraph(text);
        }
    },

    // Format bullet points into clean HTML
    formatBulletPoints(text) {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        let html = '';
        let inList = false;

        lines.forEach(line => {
            line = line.trim();
            
            // Check if it's a bullet point
            if (line.match(/^[\*\-•]\s+/)) {
                if (!inList) {
                    html += '<ul class="formatted-list">';
                    inList = true;
                }
                const content = line.replace(/^[\*\-•]\s+/, '');
                html += `<li>${this.cleanText(content)}</li>`;
            }
            // Check if it's a numbered list
            else if (line.match(/^\d+[\.\)]\s+/)) {
                if (!inList) {
                    html += '<ol class="formatted-list">';
                    inList = true;
                }
                const content = line.replace(/^\d+[\.\)]\s+/, '');
                html += `<li>${this.cleanText(content)}</li>`;
            }
            // Regular text (heading or paragraph)
            else if (line) {
                if (inList) {
                    html += inList === 'ul' ? '</ul>' : '</ol>';
                    inList = false;
                }
                // Check if it looks like a heading (short and possibly bold)
                if (line.length < 60 && !line.endsWith('.') && !line.endsWith(',')) {
                    html += `<h3 class="formatted-heading">${this.cleanText(line)}</h3>`;
                } else {
                    html += `<p class="formatted-paragraph">${this.cleanText(line)}</p>`;
                }
            }
        });

        // Close any open list
        if (inList) {
            html += inList === 'ul' ? '</ul>' : '</ol>';
        }

        return html;
    },

    // Format paragraphs with proper spacing
    formatParagraph(text) {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        let html = '';

        lines.forEach(line => {
            line = line.trim();
            if (line) {
                // Check if it's a heading (short line, no punctuation at end)
                if (line.length < 60 && !line.match(/[.!?,;:]$/)) {
                    html += `<h3 class="formatted-heading">${this.cleanText(line)}</h3>`;
                } else {
                    html += `<p class="formatted-paragraph">${this.cleanText(line)}</p>`;
                }
            }
        });

        return html;
    },

    // Clean and enhance text readability
    cleanText(text) {
        return text
            // Remove excessive spaces
            .replace(/\s+/g, ' ')
            // Remove markdown bold/italic markers if present
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Clean up any remaining markdown
            .replace(/^#+\s+/, '')
            .trim();
    },

    // Extract plain text from formatted HTML (for copying)
    extractPlainText(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.innerText;
    }
};