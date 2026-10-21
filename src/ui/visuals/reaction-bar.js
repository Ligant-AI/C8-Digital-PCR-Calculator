import { escapeHtml as esc } from '@ligant/bench-chrome';
import { readNumber } from '../../engine/parse.js';
import * as D from '../../engine/decimal.js';
import { RULED, UI } from '../text.js';
const W = 600;
export function reactionBarHtml({ total, sample, mix }, sep, ratio) {
    if (!sep)
        return '';
    const r = (t) => { const x = readNumber(t, sep); return x.kind === 'ok' ? x : null; };
    const R = r(total);
    const V = r(sample);
    const M = mix && mix.trim() ? r(mix) : null;
    if (!R || !V || D.isZero(R.dec))
        return '';
    const parts = [];
    if (M)
        parts.push({ cls: 'bar-mix', label: UI.barMix(M.text), v: Number(M.norm) });
    parts.push({ cls: 'bar-sample', label: UI.barSample(V.text), v: Number(V.norm) });
    const used = M ? D.add(M.dec, V.dec) : V.dec;
    const exceeds = D.lt(R.dec, used);
    if (D.lt(used, R.dec))
        parts.push({ cls: 'bar-rest', label: M ? UI.barRest : RULED.remainderNotEntered, v: Number(R.norm) - Number((M ? D.toText(used) : V.norm)) });
    const scale = Math.max(Number(R.norm), parts.reduce((a, p) => a + p.v, 0));
    let x = 0;
    const rects = parts.map((p, i) => {
        const w = (p.v / scale) * W;
        const out = `<rect class="${p.cls}" x="${x.toFixed(2)}" y="2" width="${Math.max(w, 1).toFixed(2)}" height="22" data-part="${i}"><title>${esc(p.label)}</title></rect>`;
        p.mid = x + w / 2;
        x += w;
        return out;
    }).join('');
    const totalX = (Number(R.norm) / scale) * W;
    const marker = `<line class="bar-total" x1="${totalX.toFixed(2)}" y1="0" x2="${totalX.toFixed(2)}" y2="30" />`;
    const labels = parts.map((p, i) => `<li data-part="${i}"><span class="bar-key ${p.cls}" aria-hidden="true"></span>${esc(p.label)}</li>`).join('');
    return `<figure class="visual reaction-figure"><svg class="reaction-bar" viewBox="-1 -1 ${W + 2} 32" preserveAspectRatio="none" role="img" aria-label="${esc(UI.barAria)}">${rects}${marker}</svg>`
        + `<ul class="bar-labels">${labels}<li class="bar-total-label"><span class="bar-key bar-total-key" aria-hidden="true"></span>${esc(UI.barTotal(R.text))}${exceeds ? ` ${esc(UI.barExceeds)}` : ''}</li></ul>`
        + (ratio && !exceeds ? `<p class="help num bar-ratio">${esc(UI.barRatio(R.text, V.text, ratio.display))}</p>` : '')
        + '</figure>';
}
