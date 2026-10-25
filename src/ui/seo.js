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
export function videoObject() {
    return {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: 'Digital PCR: how many copies in 15,000 positive partitions?',
        description: '15,000 of 20,000 partitions are positive. How many copies are inside them? A rain-on-tiles picture first, then the free Ligant Digital PCR Calculator: the counted and expected partitions, the curve, the "Try this" prediction and the partition volume you declare.',
        thumbnailUrl: [`${CANONICAL}explainer-thumbnail.png`, 'https://i.ytimg.com/vi/68aAS91-ZhY/maxresdefault.jpg'],
        uploadDate: '2026-10-24T08:07:15-07:00',
        duration: 'PT6M37S',
        sameAs: 'https://youtu.be/68aAS91-ZhY',
        creator: { '@type': 'Organization', name: 'Ligant', url: 'https://ligant.ai/' },
        publisher: { '@type': 'Organization', name: 'Ligant', url: 'https://ligant.ai/' },
        isAccessibleForFree: true,
        about: { '@type': 'SoftwareApplication', url: CANONICAL },
    };
}
const block = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
export function jsonLdHtml() {
    return `${block(softwareApplication())}\n  ${block(faqPage())}\n  ${block(videoObject())}`;
}
export const FAQ_HEADING = UI.faqHeading;
