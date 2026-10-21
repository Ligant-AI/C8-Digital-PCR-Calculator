import { escapeHtml as esc } from '@ligant/bench-chrome';
import { RULED, UI } from './text.js';
import { CONFIG } from '../config.js';
import { ENGINE_VERSION } from '../engine/version.js';
export const CANONICAL = `${CONFIG.publicBase}${CONFIG.slug}/`;
export function faqHtml() {
    return RULED.faq.map(({ q, a }) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('');
}
export function softwareApplication() {
    return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Ligant · Digital PCR Calculator',
        alternateName: ['ddPCR calculator'],
        url: CANONICAL,
        description: RULED.schemaDescription,
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0' },
        license: 'https://www.apache.org/licenses/LICENSE-2.0',
        softwareVersion: ENGINE_VERSION,
        codeRepository: CONFIG.publicRepoUrl,
        featureList: [...RULED.featureList],
    };
}
export function faqPage() {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: RULED.faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    };
}
const block = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
export function jsonLdHtml() {
    return `${block(softwareApplication())}\n  ${block(faqPage())}`;
}
export const FAQ_HEADING = UI.faqHeading;
