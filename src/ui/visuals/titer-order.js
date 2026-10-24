import { escapeHtml as esc } from '@ligant/bench-chrome';
import { RULED, RULED_1_1 as R, RULED_1_1_FORMS as F } from '../text.js';
import { DNASE_LINE } from '../../engine/labels.js';
export const optionAnswer = (option) => option.replace(/ \([^()]*\)$/, '');
export function panel3(t) {
    const o = RULED.freeDnaOptions;
    if (t.dnase === 'yes')
        return { sub: F.orderDeclared(o.yes), line: 'dashed' };
    if (t.dnase === 'other')
        return { sub: t.dnaseText === null ? R.orderMethodEmpty : F.orderMethod(t.dnaseText), line: 'dashed' };
    if (t.dnase === 'no')
        return { sub: F.orderDeclared(o.no), line: 'dotted' };
    if (t.dnase === 'not-known')
        return { sub: F.orderDeclared(o['not-known']), line: 'dotted' };
    return { sub: R.orderUnanswered, line: 'dotted' };
}
export function panel4(t) {
    const o = RULED.lysisOptions;
    if (t.lysis === 'proteinase-k' || t.lysis === 'heat' || t.lysis === 'pcr-start')
        return { sub: F.orderDeclared(optionAnswer(o[t.lysis])), line: 'dashed' };
    if (t.lysis === 'other')
        return { sub: t.lysisText === null ? R.orderOtherEmpty : F.orderOther(t.lysisText), line: 'dashed' };
    if (t.lysis === 'not-known')
        return { sub: F.orderDeclared(o['not-known']), line: 'dotted' };
    return { sub: R.orderUnanswered, line: 'dotted' };
}
export function conditionsLine(t) {
    if (t.lysisText !== null)
        return F.orderConditions(t.lysisText);
    if (t.lysis === 'heat')
        return R.orderConditionsEmpty;
    return null;
}
export const tm04Line = (t) => (t.dnase === 'no' || t.dnase === 'not-known' ? DNASE_LINE : null);
const GLYPH_CAPSID = '<svg class="to-glyph" viewBox="0 0 48 40" width="48" height="40" aria-hidden="true" focusable="false">'
    + '<polygon class="to-ink" points="24,3 42,13 42,27 24,37 6,27 6,13"/>'
    + '<path class="to-ink" d="M14 20 q 3.3 -5 6.7 0 t 6.6 0 t 6.7 0"/></svg>';
const GLYPH_STRAND = '<svg class="to-glyph" viewBox="0 0 48 40" width="48" height="40" aria-hidden="true" focusable="false">'
    + '<path class="to-ink" d="M10 20 q 4.7 -6 9.3 0 t 9.4 0 t 9.3 0"/></svg>';
const arrow = (join) => `<span class="to-join to-arrow" data-join="${join}" aria-hidden="true"><svg viewBox="0 0 16 12" width="16" height="12" focusable="false"><path class="to-ink" d="M1 6 H13 M9 2 L13 6 L9 10"/></svg></span>`;
const box = (n, title, sub, line, glyph = '', typed = false) => `<div class="to-panel to-${line}" data-panel="${n}" data-line="${line}">${glyph}`
    + `<p class="to-title">${esc(title)}</p>${sub ? `<p class="to-sub"${typed ? ' data-typed="1"' : ''}>${esc(sub)}</p>` : ''}</div>`;
export function titerOrderHtml(t) {
    const p3 = panel3(t);
    const p4 = panel4(t);
    const cond = conditionsLine(t);
    const tm04 = tm04Line(t);
    return `<figure class="titer-order" id="titer-order" aria-labelledby="titer-order-heading" data-dnase="${esc(t.dnase || '')}" data-lysis="${esc(t.lysis || '')}">`
        + `<h3 class="to-heading" id="titer-order-heading">${esc(R.orderHeading)}</h3>`
        + '<div class="to-row">'
        + box(1, R.orderPanel1, '', 'solid', GLYPH_CAPSID)
        + `<span class="to-join to-plus" data-join="1-2">${esc(R.orderJoin)}</span>`
        + box(2, R.orderPanel2, R.orderPanel2Sub, 'solid', GLYPH_STRAND)
        + arrow('2-3')
        + box(3, R.orderPanel3, p3.sub, p3.line, '', t.dnase === 'other' && t.dnaseText !== null)
        + arrow('3-4')
        + box(4, R.orderPanel4, p4.sub, p4.line, '', t.lysis === 'other' && t.lysisText !== null)
        + (cond ? `<p class="to-conditions">${esc(cond)}</p>` : '')
        + '</div>'
        + (tm04 ? `<p class="help to-tm04">${esc(tm04)}</p>` : '')
        + `<figcaption class="help to-caption">${esc(R.orderCaption)}</figcaption></figure>`;
}
