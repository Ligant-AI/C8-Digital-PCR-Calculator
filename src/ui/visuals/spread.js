import { escapeHtml as esc } from '@ligant/bench-chrome';
import { RULED_1_1 as T, RULED_1_1_FORMS as F } from '../text.js';
import { spreadForWell, UNDER_HALF } from '../../engine/visual.js';
import { formatWhole } from '../../engine/numfmt.js';
const BAR_W = 60;
const H = 100;
export const expectedText = (display) => (display === UNDER_HALF ? display : F.about(display));
export const spreadKey = (well) => `spread-${well}`;
export function spreadHtml(well, separator, open) {
    const s = spreadForWell(well, separator);
    if (!s)
        return '';
    if (s.status === 'none')
        return `<p class="help spread-none" data-spread-none="${esc(well.well)}">${esc(T.spreadPIsOne)}</p>`;
    const [k, n] = well.p.fraction.split(' ÷ ');
    const counted0 = formatWhole(s.counted0);
    const bars = [{ label: '0', value: s.counted0, text: counted0, word: T.spreadCounted, counted: true }];
    if (s.status === 'chart') {
        ['1', '2', '3', T.spreadFourOrMore].forEach((label, i) => bars.push({ label, value: s.bins[i].unrounded, text: expectedText(s.bins[i].display), word: T.spreadExpected, counted: false }));
    }
    const max = Math.max(...bars.map((b) => b.value));
    const cols = bars.length;
    const rects = bars.map((b, i) => {
        const h = max > 0 ? (b.value / max) * H : 0;
        return `<rect class="${b.counted ? 'spread-counted' : 'spread-expected'}" x="${i * 100 + (100 - BAR_W) / 2}" y="${H - h}" width="${BAR_W}" height="${h}" />`;
    }).join('');
    const svg = `<svg class="spread-svg" viewBox="0 -1 ${cols * 100} ${H + 2}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${rects}<line class="spread-base" x1="0" x2="${cols * 100}" y1="${H}" y2="${H}" /></svg>`;
    const bracket = s.status === 'chart' ? `<p class="spread-bracket">${esc(F.spreadBracket(k))}</p>` : '';
    const cells = bars.map((b) => `<li class="spread-cell${b.counted ? ' is-counted' : ''}"><span class="spread-bin">${esc(b.label)}</span><span class="num spread-value">${esc(b.text)}</span><span class="spread-word">${esc(b.word)}</span></li>`).join('');
    let copies;
    if (s.status === 'zero')
        copies = F.spreadZero(n);
    else if (s.bracket === 1)
        copies = F.spreadCopiesOne(n);
    else
        copies = F.spreadCopies(s.copies.display, n, k);
    return `<details class="options spread-details" data-spread="${esc(spreadKey(well.well))}"${open ? ' open' : ''}><summary>${esc(T.spreadSummary)}</summary>`
        + `<figure class="visual spread-figure spread-cols-${cols}">${bracket}${svg}<ul class="spread-cells">${cells}</ul><p class="hint spread-cells-key">${esc(T.spreadCellsKey)}</p></figure>`
        + `<p class="spread-copies">${esc(copies)}</p>`
        + `<p class="hint">${esc(T.spreadCaption)}</p><p class="hint">${esc(T.spreadHelp1)}</p><p class="hint">${esc(T.spreadHelp2)}</p><p class="hint spread-precision">${esc(T.spreadPrecision)}</p></details>`;
}
