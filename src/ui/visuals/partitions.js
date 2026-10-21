import { escapeHtml as esc } from '@ligant/bench-chrome';
import { RULED } from '../text.js';
const W = 600;
export function partitionsHtml(well, neg) {
    const p = well.p.unrounded;
    const wp = p * W;
    const svg = `<svg class="partition-bar" viewBox="-1 -1 ${W + 2} 20" preserveAspectRatio="none" role="img" aria-label="${esc(RULED.barPositive(well.p.display))}${neg && well.status === 'computed' ? `; ${esc(RULED.barNegative(neg.display))}` : ''}">`
        + (wp > 0 ? `<rect class="part-pos" x="0" y="0" width="${wp.toFixed(2)}" height="18" />` : '')
        + (wp < W ? `<rect class="part-neg" x="${wp.toFixed(2)}" y="0" width="${(W - wp).toFixed(2)}" height="18" />` : '')
        + '</svg>';
    const caption = well.status === 'computed' ? `<figcaption class="help">${esc(RULED.partitionCaption(well.lambda.display))}</figcaption>` : '';
    return `<figure class="visual partitions-figure" data-result="bar-${esc(well.well)}">${svg}`
        + `<div class="part-labels"><span class="part-label-pos">${esc(RULED.barPositive(well.p.display))}</span>`
        + `${neg && well.status === 'computed' ? `<span class="part-label-neg">${esc(RULED.barNegative(neg.display))}</span>` : ''}</div>${caption}</figure>`;
}
