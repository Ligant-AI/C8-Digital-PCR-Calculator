import { escapeHtml as esc } from '@ligant/bench-chrome';
import { RULED, RULED_1_1, UI } from '../text.js';
const PER_ML = 'copies per mL of the original sample';
const ROW_FLAGS = ['FL-01', 'FL-02', 'FL-03', 'FL-09'];
export const wellCardId = (i) => `well-card-${i + 1}`;
const code = (c) => `<a class="code" href="#flag-${esc(c)}">${esc(c)}</a>`;
const pct = (v) => `${Math.round(v * 1e6) / 1e4}%`;
export function overviewScale(result) {
    const computed = result.wells.filter((w) => w.status === 'computed');
    if (!computed.length)
        return { axis: 'none', max: null, maxWell: null, at: () => null };
    let maxWell = computed[0];
    for (const w of computed)
        if (w.perMl.unrounded > maxWell.perMl.unrounded)
            maxWell = w;
    const max = maxWell.perMl.unrounded;
    if (max === 0)
        return { axis: 'zero', max: 0, maxWell, at: () => 0 };
    return { axis: 'scale', max, maxWell, at: (v) => v / max };
}
function strip(markers, meanAt, zero) {
    const line = meanAt === null ? '' : `<line class="ov-mean" x1="${pct(meanAt)}" x2="${pct(meanAt)}" y1="0" y2="100%" />`;
    const rule = zero ? '<line class="ov-zero" x1="0" x2="0" y1="0" y2="100%" />' : '';
    return `<div class="ov-strip" aria-hidden="true"><svg class="ov-svg" focusable="false">${rule}${line}${markers}</svg></div>`;
}
export function overviewHtml(result) {
    if (!result || result.status !== 'result' || result.wells.length < 2)
        return '';
    const scale = overviewScale(result);
    const mean = result.mean && result.mean.status === 'computed' ? result.mean : null;
    const meanAt = mean && scale.axis === 'scale' ? scale.at(mean.perMl.unrounded) : null;
    const zeroRule = scale.axis !== 'none';
    const flagWells = (c) => (result.flags.find((f) => f.display === c) || { wells: [] }).wells;
    const fl06 = result.flags.find((f) => f.display === 'FL-06');
    const fl06Preps = new Set(fl06 ? (fl06.steps || []).map((s) => String(s).split('/')[0]) : []);
    const groups = [];
    result.wells.forEach((w, i) => {
        let g = groups.find((x) => x.prep === w.prep);
        if (!g) {
            g = { prep: w.prep, F: w.F && w.F.display, rows: [] };
            groups.push(g);
        }
        g.rows.push({ w, i });
    });
    const rowHtml = ({ w, i }) => {
        const at = w.status === 'computed' ? scale.at(w.perMl.unrounded) : null;
        const marker = at === null ? '' : `<circle class="${w.inMean ? 'ov-in' : 'ov-out'}" cx="${pct(at)}" cy="50%" r="5" />`;
        const codes = ROW_FLAGS.filter((c) => flagWells(c).includes(w.well));
        return `<div class="ov-row" data-result="overview-${esc(w.well)}">`
            + `<p class="ov-l1"><a class="ov-well" href="#${wellCardId(i)}">${esc(w.well)}</a> <span class="ov-counts">${esc(UI.countsOf(w.echo.positive, w.echo.accepted))}${w.inMean ? '' : `, ${esc(RULED.notInMean)}`}</span></p>`
            + `<p class="ov-l2"><span class="num ov-value">${esc(w.perMl.display)}</span>${codes.length ? ` <span class="ov-flags">${codes.map(code).join(' ')}</span>` : ''}</p></div>`
            + strip(marker, meanAt, zeroRule);
    };
    const body = groups.map((g) => `<p class="ov-group">${esc(g.prep)}, × ${esc(g.F)}${fl06Preps.has(g.prep) ? ` ${code('FL-06')}` : ''}</p>${strip('', meanAt, zeroRule)}`
        + g.rows.map(rowHtml).join('')).join('');
    let axis = '';
    if (scale.axis === 'zero')
        axis = '<p class="ov-axis"><span class="num">0</span></p>';
    if (scale.axis === 'scale')
        axis = `<p class="ov-axis"><span class="num">0</span><span class="ov-axis-end"><span class="num">${esc(scale.maxWell.perMl.display)}</span>, ${esc(scale.maxWell.well)}</span></p>`;
    const glyph = (cls) => `<svg class="ov-glyph" aria-hidden="true" focusable="false" width="12" height="12">${cls === 'ov-mean' ? '<line class="ov-mean" x1="6" x2="6" y1="0" y2="12" />' : `<circle class="${cls}" cx="6" cy="6" r="4.5" />`}</svg>`;
    const meanItem = mean ? `<li>${meanAt === null ? '' : glyph('ov-mean')}<span><span class="num">${esc(mean.perMl.display)}</span>, ${esc(UI.meanOf(mean.wells.length, mean.wells))}</span></li>` : '';
    const key = !zeroRule ? '' : `<ul class="ov-key"><li>${glyph('ov-in')}${esc(RULED_1_1.overviewInMean)}</li><li>${glyph('ov-out')}${esc(RULED_1_1.overviewNotInMean)}</li>${meanItem}</ul>`;
    return `<section class="overview" data-overview="1" aria-labelledby="overview-heading">`
        + `<h3 class="sub-h" id="overview-heading">${esc(RULED_1_1.overviewHeading)}</h3>`
        + `<p class="hint ov-quantity">${esc(result.headline || PER_ML)}</p>`
        + `<div class="ov-grid">${body}${axis ? `<div></div>${axis}` : ''}</div>`
        + key
        + `<p class="hint ov-caption">${esc(RULED_1_1.overviewCaption)}</p></section>`;
}
