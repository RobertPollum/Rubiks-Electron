// Helpers for building HTML strings safely.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Escape a value for use in HTML text or a quoted attribute.
 * Use this for anything that comes from saved data or imported files
 * (preset names, descriptions, ids, colours), never trust it as markup.
 */
export function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ESCAPES[c]);
}
