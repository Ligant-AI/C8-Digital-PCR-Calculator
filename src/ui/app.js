import { determine } from '../engine/determine.js';
import { readNumber } from '../engine/parse.js';
import { partitionVolumeInMicroLitre, echoVolume } from '../engine/units.js';
import { escapeHtml as esc } from '@ligant/bench-chrome';
import { initialState, newPrep, newStep, newWell, caseOf, fieldNotes, formProblems, insertPanelValue, separatorOf, wellRows, prepName } from './state.js';
import { formHtml, sourceText, WHY_NOTES } from './form.js';
import { titerOrderHtml } from './visuals/titer-order.js';
import { dotsHtml } from './visuals/dots.js';
import { curveHtml } from './visuals/curve.js';
import { summaryHtml, detailHtml, factorsFrom } from './results.js';
import { sectionsHtml } from './sections.js';
import { faqHtml } from './seo.js';
import { tubesHtml } from './visuals/tubes.js';
import { reactionBarHtml } from './visuals/reaction-bar.js';
import { UI } from './text.js';
import { entriesInProgress, loadExample } from './learn.js';
import { buildRecord, exportDate } from './exports/record.js';
import { notebookText } from './exports/notebook.js';
import { csvText } from './exports/csv.js';
import { jsonText } from './exports/json.js';
import { svgText, SVG_MIME } from './exports/svg.js';
import { benchSheetHtml, sheetReady } from './exports/benchsheet.js';
import { fileExport } from './exports/save.js';
import { exportPanelHtml, csvDecimalOf } from './exports/panel.js';
import { CONFIG } from '../config.js';
const $ = (id) => document.getElementById(id);
const state = initialState();
let result = null;
let learnConfirming = false;
let spreadOpen = {};
let whyUser = {};
let whyForced = {};
const STRUCTURAL = /^(titer|prep:[^:]+:kind|titre\.(dnase|targetClass)|paste\.(text|separator|headerRow|mapping\.\w+)|pv\.unit|prep:[^:]+:name)$/;
function setByBind(bind, el) {
    const value = el.type === 'checkbox' ? el.checked : el.value;
    const parts = bind.split(':');
    if (bind === 'titer') {
        state.titer = value;
        return;
    }
    if (parts[0] === 'prep') {
        const p = state.preps.find((x) => x.uid === parts[1]);
        p[parts[2]] = parts[2] === 'kind' ? value : value;
        if (parts[2] === 'kind' && value === 'steps' && p.steps.length === 0)
            p.steps.push(newStep());
        return;
    }
    if (parts[0] === 'step') {
        const p = state.preps.find((x) => x.uid === parts[1]);
        p.steps.find((s) => s.uid === parts[2])[parts[3]] = value;
        return;
    }
    if (parts[0] === 'well') {
        const w = state.wells.find((x) => x.uid === parts[1]);
        w[parts[2]] = parts[2] === 'prep' ? (value || null) : value;
        return;
    }
    if (parts[0] === 'pwell') {
        const i = Number(parts[1]);
        while (state.wells.length <= i)
            state.wells.push(newWell(state.wells.length + 1));
        state.wells[i][parts[2]] = parts[2] === 'prep' ? (value || null) : value;
        return;
    }
    const path = bind.split('.');
    let obj = state;
    for (const k of path.slice(0, -1))
        obj = obj[k];
    const last = path[path.length - 1];
    if (path[0] === 'paste' && path[1] === 'mapping')
        obj[last] = value === '' ? null : value === 'number' ? 'number' : Number(value);
    else
        obj[last] = value;
    if (path[0] === 'pv' && (last === 'value' || last === 'unit') && state.learn)
        state.learn.volumeUnchanged = false;
    if (path[0] === 'pv' && (last === 'value' || last === 'unit') && typeof state.pv.source === 'object')
        state.pv.source = 'user';
}
function renderForm() {
    const active = document.activeElement;
    const focusBind = active && active.dataset ? active.dataset.bind : null;
    const focusValue = active && active.type === 'radio' ? active.value : null;
    const caret = active && typeof active.selectionStart === 'number' ? active.selectionStart : null;
    const tryOpen = Boolean(document.querySelector('#tool-form details.try-answer[open]'));
    $('tool-form').innerHTML = formHtml(state, factorsFrom(state), learnConfirming);
    const tryAnswer = $('tool-form').querySelector('details.try-answer');
    if (tryAnswer)
        tryAnswer.open = tryOpen;
    if (focusBind) {
        const sel = `[data-bind="${CSS.escape(focusBind)}"]${focusValue ? `[value="${CSS.escape(focusValue)}"]` : ''}`;
        const el = $('tool-form').querySelector(sel);
        if (el) {
            el.focus();
            if (caret !== null && typeof el.setSelectionRange === 'function')
                el.setSelectionRange(caret, caret);
        }
    }
}
function placeNotes(notes) {
    for (const el of document.querySelectorAll('[data-note]')) {
        const n = notes[el.dataset.note];
        const shown = n && (n.refusal || n.advice || state.touched) ? n : null;
        const text = shown ? (shown.refusal || shown.missing || shown.advice) : '';
        el.hidden = !text;
        if (shown && !shown.refusal && shown.missing)
            el.innerHTML = `<b>${esc(UI.neededPrefix)}</b> ${esc(n.missing)}`;
        else
            el.textContent = text || '';
        el.className = `note${shown && shown.refusal ? ' refusal' : shown && (shown.missing || shown.advice) ? ' missing' : ''}`;
    }
    for (const tr of document.querySelectorAll('tr.row-note'))
        tr.hidden = ![...tr.querySelectorAll('[data-note]')].some((p) => !p.hidden);
}
function foldWhys() {
    const shown = [...document.querySelectorAll('[data-note]')].filter((el) => !el.hidden).map((el) => el.dataset.note);
    for (const d of document.querySelectorAll('details.why-fold[data-why]')) {
        const key = d.dataset.why;
        const re = WHY_NOTES[key];
        const forced = Boolean(state.learn) || Boolean(re && shown.some((k) => re.test(k)));
        if (forced && !whyForced[key])
            d.open = true;
        else if (!forced)
            d.open = whyUser[key] === true;
        whyForced[key] = forced;
    }
}
function refusalNotes(res) {
    const out = {};
    if (res.status !== 'rejected')
        return out;
    const prepUid = (name) => state.preps.find((p) => prepName(state, p) === name)?.uid;
    const rows = wellRows(state).map((w) => String(w.label).trim());
    const add = (key, message) => { out[key] = { refusal: out[key] ? `${out[key].refusal} ${message}` : message }; };
    for (const r of res.refusals) {
        const f = r.field;
        if (r.steps.length) {
            const [name, n] = r.steps[0].split('/');
            add(`prep:${prepUid(name)}:step:${Number(n) - 1}`, r.message);
        }
        else if (r.wells.length) {
            add(`well:${rows.indexOf(r.wells[0])}:${f === 'accepted' ? 'accepted' : 'positive'}`, r.message);
        }
        else if (f === 'wells' || f === 'steps') {
            add(f === 'wells' ? 'wells' : `prep:${prepUid(r.preps[0])}:steps`, r.message);
        }
        else if (r.preps.length) {
            add(`prep:${prepUid(r.preps[0])}:${f}`, r.message);
        }
        else {
            const key = { partitionVolume: 'pv:value', expectedAccepted: 'expected', replicateRatio: 'titre:ratio', rangeLow: 'titre:range', rangeHigh: 'titre:range', preparations: 'preparations' }[f] || f;
            add(key, r.message);
        }
    }
    return out;
}
function pvEcho() {
    const sep = separatorOf(state);
    const r = sep && state.pv.unit ? readNumber(state.pv.value, sep) : null;
    if (!r || r.kind !== 'ok')
        return '';
    const micro = partitionVolumeInMicroLitre(r.norm, state.pv.unit);
    return micro ? echoVolume(r.text, state.pv.unit, micro.text, sep) : '';
}
function update({ structural = false } = {}) {
    const problems = formProblems(state);
    result = determine(caseOf(state));
    if (structural)
        renderForm();
    else {
        const factors = factorsFrom(state);
        for (const p of state.preps) {
            const f = factors[p.uid];
            p.steps.forEach((_, i) => { const el = document.querySelector(`[data-slot="factor:${p.uid}:${i}"]`); if (el)
                el.textContent = f && f.steps[i] ? `× ${f.steps[i]}` : ''; });
            const o = document.querySelector(`[data-slot="overall:${p.uid}"]`);
            if (o)
                o.textContent = f && f.overall ? `× ${f.overall}` : '';
        }
    }
    const visualFactors = factorsFrom(state);
    for (const p of state.preps) {
        const f = visualFactors[p.uid];
        const tubes = document.querySelector(`[data-slot="tubes:${p.uid}"]`);
        if (tubes)
            tubes.innerHTML = tubesHtml(p.steps.map((s, i) => ({ in: s.in, total: s.total, factor: f && f.stepValues[i] ? f.stepValues[i] : null })), f ? f.overall : null);
        const bar = document.querySelector(`[data-slot="bar:${p.uid}"]`);
        if (bar)
            bar.innerHTML = reactionBarHtml({ total: p.total, sample: p.sample, mix: p.mix }, separatorOf(state), f ? f.ratio : null);
    }
    const notes = fieldNotes(state);
    for (const [k, v] of Object.entries(refusalNotes(result)))
        notes[k] = { ...(notes[k] || {}), refusal: v.refusal };
    placeNotes(notes);
    if (structural)
        whyForced = {};
    foldWhys();
    const order = document.querySelector('[data-slot="titer-order"]');
    const titre = order && state.titer ? caseOf(state).titre : null;
    if (titre)
        order.innerHTML = titerOrderHtml(titre);
    const dotsSlot = document.querySelector('[data-slot="learn-dots"]');
    const curveSlot = document.querySelector('[data-slot="learn-curve"]');
    const first = !problems.length && result.status === 'result' ? result.wells[0] : null;
    if (dotsSlot)
        dotsSlot.innerHTML = first ? dotsHtml(first, separatorOf(state), result.flags) : '';
    if (curveSlot)
        curveSlot.innerHTML = first ? curveHtml(first) : '';
    const echo = document.querySelector('[data-slot="pv-echo"]');
    if (echo)
        echo.textContent = pvEcho();
    const src = document.querySelector('[data-slot="pv-source"]');
    if (src)
        src.textContent = sourceText(state.pv.source);
    const open = new Set([...document.querySelectorAll('details.working-details[open]')].map((x) => x.dataset.result));
    const s = summaryHtml(state, result, problems);
    $('kept-summary').innerHTML = s.block;
    $('kept-summary').hidden = !s.block;
    $('summary').innerHTML = s.body;
    for (const x of document.querySelectorAll('details.spread-details[data-spread]'))
        spreadOpen[x.dataset.spread] = x.open;
    const d = detailHtml(state, problems.length ? { status: 'incomplete' } : result, spreadOpen);
    $('detail-panel').hidden = !d.body;
    $('kept-detail').innerHTML = d.block;
    $('detail').innerHTML = d.body;
    for (const key of open) {
        const x = document.querySelector(`details.working-details[data-result="${CSS.escape(key)}"]`);
        if (x)
            x.open = true;
    }
    const hs = $('kept-summary').hidden ? 0 : $('kept-summary').getBoundingClientRect().height;
    const hd = $('kept-detail').getBoundingClientRect().height;
    const points = $('points');
    if (points)
        points.style.setProperty('--block-h', `${16 + hd}px`);
    $('keep-spacer-summary').style.height = hs ? `${16 + hs}px` : '0px';
    $('keep-spacer').style.height = d.body ? `${16 + hd}px` : '0px';
    document.documentElement.dataset.status = problems.length ? 'incomplete' : result.status;
    renderExports(problems);
}
const hasResult = () => document.documentElement.dataset.status === 'result';
const fileName = (ext) => `${CONFIG.slug}-${exportDate()}.${ext}`;
const EXPORTS = {
    csv: fileExport('csv', () => csvText(buildRecord(state, result), csvDecimalOf(state)), () => fileName('csv'), 'text/csv;charset=utf-8'),
    json: fileExport('json', () => jsonText(state, result, formProblems(state)), () => fileName('json'), 'application/json'),
    svg: fileExport('svg', () => svgText(buildRecord(state, result), result), () => fileName('svg'), SVG_MIME),
};
function svgControl() {
    if (wellRows(state).length < 2)
        return 'absent';
    if (!hasResult())
        return 'disabled';
    return result.wells.length >= 2 && result.wells.some((w) => w.status === 'computed') ? 'enabled' : 'absent';
}
function renderExports() {
    const panel = $('export-panel');
    const focused = document.activeElement && panel.contains(document.activeElement) ? document.activeElement.dataset.export || null : null;
    panel.innerHTML = exportPanelHtml(state, { hasResult: hasResult(), sheetReady: sheetReady(state), svg: svgControl() });
    if (focused)
        panel.querySelector(`[data-export="${focused}"]`)?.focus();
}
function copyNotebook() {
    const text = notebookText(buildRecord(state, result));
    const status = $('copy-status');
    const fallback = () => { $('notebook-fallback').hidden = false; $('notebook-text').value = text; $('notebook-text').select(); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => { status.hidden = false; status.textContent = UI.exp.copied; }, fallback);
    }
    else
        fallback();
}
function printSheet() {
    $('bench-sheet').innerHTML = benchSheetHtml(state);
    document.documentElement.classList.add('printing-sheet');
    const done = () => { document.documentElement.classList.remove('printing-sheet'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
}
function onAction(btn) {
    const a = btn.dataset.action;
    state.touched = true;
    if (a === 'add-prep')
        state.preps.push(newPrep(state.preps.length + 1));
    if (a === 'remove-prep') {
        state.preps = state.preps.filter((p) => p.uid !== btn.dataset.prep);
        for (const w of state.wells)
            if (w.prep === btn.dataset.prep)
                w.prep = null;
    }
    if (a === 'add-step')
        state.preps.find((p) => p.uid === btn.dataset.prep).steps.push(newStep());
    if (a === 'remove-step') {
        const p = state.preps.find((x) => x.uid === btn.dataset.prep);
        p.steps = p.steps.filter((s) => s.uid !== btn.dataset.step);
    }
    if (a === 'add-well')
        state.wells.push(newWell(state.wells.length + 1));
    if (a === 'remove-well')
        state.wells = state.wells.filter((w) => w.uid !== btn.dataset.well);
    if (a === 'use-panel') {
        insertPanelValue(state, btn.dataset.panel);
        if (state.learn)
            state.learn.volumeUnchanged = false;
    }
    if (a === 'learn-load') {
        if (entriesInProgress(state))
            learnConfirming = true;
        else {
            loadExample(state);
            spreadOpen = {};
            whyUser = {};
        }
    }
    if (a === 'learn-replace') {
        loadExample(state);
        learnConfirming = false;
        spreadOpen = {};
        whyUser = {};
    }
    if (a === 'learn-keep')
        learnConfirming = false;
    if (a === 'type-instead') {
        state.entry = 'typed';
        state.paste = initialState().paste;
        state.wells = [newWell(1)];
    }
    update({ structural: true });
    if (a === 'add-well') {
        const rows = document.querySelectorAll('table.wells tbody tr[data-well]');
        rows[rows.length - 1]?.querySelector('input')?.focus();
    }
}
export function start() {
    $('about-body').innerHTML = sectionsHtml();
    $('faq-body').innerHTML = faqHtml();
    $('faq-heading').textContent = UI.faqHeading;
    $('result-heading').textContent = UI.headings.result;
    $('detail-heading').textContent = UI.headings.detail;
    $('about-heading').textContent = UI.headings.about;
    renderForm();
    const form = $('tool-form');
    const onEdit = (e) => {
        const el = e.target;
        if (!el.dataset || !el.dataset.bind)
            return;
        if (e.type === 'change' && (el.type === 'text' || el.tagName === 'TEXTAREA') && !STRUCTURAL.test(el.dataset.bind))
            return;
        state.touched = true;
        setByBind(el.dataset.bind, el);
        const structural = STRUCTURAL.test(el.dataset.bind) || el.type === 'radio' || el.type === 'checkbox' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA';
        update({ structural: structural && e.type === 'change' });
    };
    form.addEventListener('input', onEdit);
    form.addEventListener('change', onEdit);
    form.addEventListener('click', (e) => {
        const sum = e.target.closest('details.why-fold > summary');
        if (sum) {
            const d = sum.parentElement;
            whyUser[d.dataset.why] = !d.open;
            return;
        }
        const b = e.target.closest('button[data-action]');
        if (b)
            onAction(b);
    });
    form.addEventListener('paste', (e) => {
        const el = e.target;
        if (!el.dataset || !/^well:.+:(positive|accepted|label)$/.test(el.dataset.bind || ''))
            return;
        const text = e.clipboardData ? e.clipboardData.getData('text/plain') : '';
        if (!/[\t\n]/.test(text.trim()))
            return;
        e.preventDefault();
        state.touched = true;
        state.entry = 'pasted';
        state.paste = { ...initialState().paste, text };
        state.wells = [];
        update({ structural: true });
        $('paste-text')?.focus();
    });
    form.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || !e.target.dataset)
            return;
        const b = e.target.dataset.bind || '';
        if (/^well:.+:accepted$/.test(b) && state.wells[state.wells.length - 1]?.uid === b.split(':')[1]) {
            e.preventDefault();
            onAction({ dataset: { action: 'add-well' } });
        }
        else if (e.target.tagName === 'INPUT' && e.target.type === 'text')
            e.preventDefault();
    });
    $('export-panel').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-export]');
        if (!b || b.disabled)
            return;
        if (b.dataset.export === 'notebook')
            copyNotebook();
        else if (b.dataset.export === 'sheet')
            printSheet();
        else if (EXPORTS[b.dataset.export])
            EXPORTS[b.dataset.export].run();
    });
    $('export-panel').addEventListener('change', (e) => {
        if (e.target.name === 'csv-decimal') {
            state.exportDecimal = e.target.value;
            renderExports();
        }
    });
    update({ structural: false });
    document.documentElement.dataset.ready = '1';
}
export const _forTests = { state, esc };
