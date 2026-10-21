import { escapeHtml as esc } from '@ligant/bench-chrome';
export const FREE_TEXT_MAX = 40;
export function clip(text) {
    const chars = [...String(text)];
    return chars.length > FREE_TEXT_MAX ? `${chars.slice(0, FREE_TEXT_MAX).join('').trimEnd()}…` : String(text);
}
const decl = (cls, { id, label, value, prefix = '', free, wrap }) => `<span class="${cls}${free || wrap ? ' wrap' : ''}" data-decl="${esc(id)}"><b>${esc(label)}</b>${esc(prefix)}${esc(free ? clip(value) : value)}</span>`;
export function flagLineText({ title, count }) {
    return count ? `${title}: ${count}` : title;
}
export function blockHtml({ declarations = [], preparations = [], flags = [], flagForm = 'lines', noFlags = '' }) {
    const chips = flagForm === 'chips';
    const items = declarations.map((d) => decl('decl', d)).join('') + preparations.map((p) => decl('decl prep', p)).join('');
    const lines = flags.length
        ? flags.map((f) => `<li data-flag="${esc(f.code)}"><a href="#flag-${esc(f.code)}"${chips && f.title ? ` title="${esc(f.title)}"` : ''}><span class="code">${esc(f.code)}</span>${esc(chips ? f.count || '' : flagLineText(f))}</a></li>`).join('')
        : `<li class="none" data-flag="none">${esc(noFlags)}</li>`;
    return `<div class="rail-declarations" aria-label="declarations the result was computed under"><div class="declarations-content">${items}</div></div>`
        + `<ul class="flag-summary${chips && flags.length ? ' chips' : ''}" aria-label="flags raised">${lines}</ul>`;
}
