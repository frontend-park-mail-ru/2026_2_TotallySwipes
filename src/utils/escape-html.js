const replacements = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

export function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => replacements[char]);
}
