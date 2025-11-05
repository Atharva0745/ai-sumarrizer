function getArticleText() {
    let article = document.querySelector('article');
    if (article) {
        return article.innerText;
    } 
    const paragraphs = Array.from(document.getElementsByTagName('p'));
    if (paragraphs.length > 0) {
        return paragraphs.map(p => p.innerText).join('\n\n');
    }
}
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.type==='GET_ARTICLE_TEXT') {
        const text = getArticleText();
        sendResponse({text});
    }
});