import { escapeHtml as esc } from '@ligant/bench-chrome';
import { RULED_1_1 as R, RULED_1_1_FORMS as F } from '../text.js';
import { readCounts, dotGrid } from '../../engine/visual.js';
import { formatWhole } from '../../engine/numfmt.js';
import { groupedInteger } from '../../engine/decimal.js';
const COLS = 20;
const ROWS = 10;
const PITCH = 12;
const RADIUS = 4.5;
export function dotsModel(well, separator, flags = []) {
    const c = readCounts(well.echo.positive, well.echo.accepted, separator);
    if (c.status !== 'ok')
        return null;
    const g = dotGrid(c.k, c.n);
    if (g.status !== 'drawn')
        return { status: 'not-drawn' };
    const caption = F.dotCaption(formatWhole(g.perDot), groupedInteger(c.nRead.dec), formatWhole(g.filled));
    let fl01 = null;
    if (well.status === 'undefined') {
        const f = flags.find((x) => x.code === 'T1-FL-01');
        const i = f ? f.wells.indexOf(well.well) : -1;
        if (i >= 0)
            fl01 = { code: f.display, message: f.messages[i] };
    }
    return { status: 'drawn', filled: g.filled, caption, fl01 };
}
export function dotsHtml(well, separator, flags = []) {
    const m = dotsModel(well, separator, flags);
    if (!m)
        return '';
    if (m.status !== 'drawn')
        return `<figure class="visual learn-dots" data-learn="dots" data-drawn="0"><p class="help dots-fallback">${esc(R.dotFallback)}</p></figure>`;
    let dots = '';
    for (let i = 0; i < COLS * ROWS; i++) {
        const cx = (i % COLS) * PITCH + PITCH / 2;
        const cy = Math.floor(i / COLS) * PITCH + PITCH / 2;
        dots += `<circle class="${i < m.filled ? 'dot-pos' : 'dot-neg'}" cx="${cx}" cy="${cy}" r="${RADIUS}"/>`;
    }
    const svg = `<svg class="dot-grid" viewBox="0 0 ${COLS * PITCH} ${ROWS * PITCH}" role="img" aria-label="${esc(m.caption)}" focusable="false">${dots}</svg>`;
    const fl01 = m.fl01 ? `<p class="dots-fl01"><span class="code">${esc(m.fl01.code)}</span> <span class="flag-message">${esc(m.fl01.message)}</span></p>` : '';
    return `<figure class="visual learn-dots" data-learn="dots" data-drawn="1" data-filled="${m.filled}">${svg}${fl01}<figcaption class="help dots-caption">${esc(m.caption)}</figcaption></figure>`;
}
