import { escapeHtml as esc } from '@ligant/bench-chrome';
import { RULED_1_1 as R, RULED_1_1_FORMS as F } from '../text.js';
import { curvePoints } from '../../engine/visual.js';
import { formatRatio, formatLambda } from '../../engine/numfmt.js';
const CURVE = curvePoints();
const LAST = CURVE.points[CURVE.points.length - 1];
const EXAMPLE = CURVE.points[750];
const W = 480;
const H = 240;
const PAD = 10;
const x = (p) => PAD + (p / LAST.p) * (W - 2 * PAD);
const y = (lambda) => H - PAD - (lambda / LAST.lambda) * (H - 2 * PAD);
const LINE = CURVE.points.map((pt) => `${x(pt.p).toFixed(2)},${y(pt.lambda).toFixed(2)}`).join(' ');
const RING_R = 7;
const DISC_R = 4.5;
export const CURVE_TEXT = Object.freeze({
    origin: formatLambda(CURVE.points[0].lambda),
    edgeValue: F.curveEdgeValue(CURVE.edge.lambda, CURVE.edge.p),
    edge: F.curveEdge(CURVE.edge.p),
    keyExample: F.curveKeyExample(formatRatio(EXAMPLE.p), formatLambda(EXAMPLE.lambda)),
});
export function wellOnCurve(well) {
    if (well.status === 'undefined')
        return { kind: 'p1', line: F.curvePIsOne(well.well) };
    if (well.p.unrounded > LAST.p)
        return { kind: 'beyond', line: F.curveBeyond(well.well, well.p.display, well.lambda.display) };
    return { kind: 'marker', key: F.curveKeyWell(well.well, well.p.display, well.lambda.display) };
}
const ringIcon = `<svg class="curve-key-icon" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true" focusable="false"><circle class="curve-ring" cx="9" cy="9" r="${RING_R}"/></svg>`;
const discIcon = `<svg class="curve-key-icon" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true" focusable="false"><circle class="curve-disc" cx="9" cy="9" r="${DISC_R}"/></svg>`;
export function curveHtml(well) {
    const u = wellOnCurve(well);
    const disc = u.kind === 'marker' ? `<circle class="curve-disc" data-marker="well" cx="${x(well.p.unrounded).toFixed(2)}" cy="${y(well.lambda.unrounded).toFixed(2)}" r="${DISC_R}"/>` : '';
    const ring = `<circle class="curve-ring" data-marker="example" cx="${x(EXAMPLE.p).toFixed(2)}" cy="${y(EXAMPLE.lambda).toFixed(2)}" r="${RING_R}"/>`;
    const svg = `<svg class="curve" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(R.curveCaption)}" focusable="false">`
        + `<path class="curve-axis" d="M${PAD} ${PAD} V${H - PAD} H${W - PAD}"/>`
        + `<path class="curve-edge" d="M${x(LAST.p).toFixed(2)} ${PAD} V${H - PAD}"/>`
        + `<polyline class="curve-line" points="${LINE}"/>${disc}${ring}</svg>`;
    const key = `<ul class="curve-key"><li data-key="example">${ringIcon}<span>${esc(CURVE_TEXT.keyExample)}</span></li>`
        + (u.kind === 'marker' ? `<li data-key="well">${discIcon}<span>${esc(u.key)}</span></li>` : '') + '</ul>';
    const note = u.kind === 'marker' ? '' : `<p class="help curve-note" data-note-kind="${u.kind}">${esc(u.line)}</p>`;
    return `<figure class="visual learn-curve" data-learn="curve" data-well="${u.kind}">`
        + '<div class="curve-plot">'
        + `<p class="curve-label curve-label-top">${esc(R.curveLabelTop)}</p><p class="curve-label curve-label-edge-value">${esc(CURVE_TEXT.edgeValue)}</p>`
        + svg
        + `<p class="curve-label curve-label-origin">${esc(CURVE_TEXT.origin)}</p><p class="curve-label curve-label-bottom">${esc(R.curveLabelBottom)}</p><p class="curve-label curve-label-edge">${esc(CURVE_TEXT.edge)}</p>`
        + '</div>'
        + key + note
        + `<figcaption class="help curve-caption">${esc(R.curveCaption)}</figcaption></figure>`;
}
