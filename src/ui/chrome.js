import { renderHeader as suiteHeader, renderFooter as suiteFooter } from '@ligant/bench-chrome';
import { CONFIG } from '../config.js';
import { RULED } from './text.js';
export function renderHeader() {
    return suiteHeader({ path: `/${CONFIG.slug}/`, title: RULED.h1, description: RULED.lead });
}
const citationTail = () => ` (v${CONFIG.version}) [Computer software]. ${CONFIG.legalEntity}. ${CONFIG.publicBase.replace('https://', '')}${CONFIG.slug}/`;
export function citationText() {
    return `${CONFIG.citationAuthor} (${CONFIG.citationYear}). ${CONFIG.toolTitle}${citationTail()}`;
}
export function renderFooter() {
    const tail = citationTail();
    return suiteFooter({
        repoUrl: CONFIG.repositoryUrl,
        citations: [{ lead: `${CONFIG.citationAuthor} (${CONFIG.citationYear}). `, title: CONFIG.toolTitle, tail }],
        citationFootnote: 'References are given as text rather than links, so the page itself sends no visit to a publisher.',
    });
}
