import { escapeHtml as esc } from '@ligant/bench-chrome';
import { RULED, RULED_1_1, UI } from './text.js';
import { PANEL_GROUPS, PANEL_VERSION, panelEntry, entryName } from './published.js';
import { prepName, wellRows, splitPaste, caseOf } from './state.js';
import { learnPanelHtml } from './learn.js';
import { titerOrderHtml } from './visuals/titer-order.js';
const UL = 'µL';
const unitHeading = (text) => { const m = /^(.*) \((µL)\)$/.exec(text); return m ? `${esc(m[1])} <span class="unit">(${m[2]})</span>` : esc(text); };
export const noteId = (key) => `note-${String(key).replace(/[^A-Za-z0-9]+/g, '-')}`;
const note = (key) => `<p class="note" id="${noteId(key)}" data-note="${esc(key)}" hidden></p>`;
const why = (text, source = '', id = '') => `<p class="help why"${id ? ` id="why-${id}"` : ''}><b>${esc(UI.whyWeAsk)}</b> ${esc(text)}${source ? ` <span class="why-source">${source}</span>` : ''}</p>`;
const fold = (key, line, learn) => `<details class="why-fold" data-why="${esc(key)}"${learn ? ' open' : ''}><summary>${esc(UI.whyFold)}<span class="visually-hidden">${esc(UI.whyFoldSuffix(UI.whyFoldField[key]))}</span></summary>${line}</details>`;
export const WHY_NOTES = Object.freeze({
    counts: /^well:\d+:(counts|positive|accepted)$/,
    reaction: /^prep:[^:]+:(total|sample)$/,
    dilution: /^prep:[^:]+:(kind|factor|steps|step:\d+(:in|:total)?)$/,
    instrument: /^instrument$/,
    target: /^target$/,
    replicates: null,
    lysis: /^titre:(lysis|lysisText)$/,
    class: /^titre:(class|classText)$/,
    separator: /^paste:separator$/,
});
const idsIn = (html) => [...String(html).matchAll(/id="((?:why|help)-[^"]+)"/g)].map((m) => m[1]);
const described = (ids) => (ids.length ? ` aria-describedby="${esc(ids.join(' '))}"` : '');
const input = (bind, value, { id = '', num = false, label = '', readonly = false, mode = 'decimal', desc = [] } = {}) => `<input type="text"${id ? ` id="${esc(id)}"` : ''} data-bind="${esc(bind)}" value="${esc(value)}"${num ? ` class="num" inputmode="${mode}"` : ''} autocomplete="off" spellcheck="false"${label ? ` aria-label="${esc(label)}"` : ''}${described(desc)}${readonly ? ' readonly' : ''}>`;
const field = (id, label, control, key, extra = '', desc = []) => {
    const ids = [noteId(key), ...idsIn(extra), ...desc];
    return `<div class="field"><label for="${esc(id)}">${esc(label)}</label>${control.replace(/^<(input|select|textarea)\b(?![^>]*aria-describedby)/, `<$1${described(ids)}`)}${note(key)}${extra}</div>`;
};
const radios = (name, bind, options, chosen, legend, key, extra = '', desc = []) => `<fieldset class="field choice" data-group="${esc(name)}"${described([noteId(key), ...idsIn(extra), ...desc])}><legend class="label">${esc(legend)}</legend><div class="radios stacked">`
    + Object.entries(options).map(([v, label]) => `<label><input type="radio" name="${esc(name)}" data-bind="${esc(bind)}" value="${esc(v)}"${chosen === v ? ' checked' : ''}> <span>${esc(label)}</span></label>`).join('')
    + `</div>${note(key)}${extra}</fieldset>`;
const panel = (n, id, heading, body, headExtra = '') => `<section class="panel" id="${id}" aria-labelledby="${id}-heading"><div class="panel-head"><div class="titles">${n ? `<span class="step">${n}</span>` : ''}<h2 id="${id}-heading">${esc(heading)}</h2></div>${headExtra}</div><div class="panel-body stack">${body}</div></section>`;
function publishedValues() {
    const groups = PANEL_GROUPS.map((g) => {
        if (g.none)
            return `<div class="pv-group"><h4>${esc(g.group)}</h4><p class="help">${esc(RULED.stillaNone)}</p></div>`;
        const src = `<p class="pv-source">${esc(g.source)}, <span class="num">${esc(g.url)}</span>${g.read ? `, ${esc(UI.panelReadOn(g.read))}` : ''}</p>`;
        const shared = g.sharedQuote ? `<blockquote>“${esc(g.sharedQuote)}”</blockquote>` : '';
        const entries = g.entries.map((e) => `<li class="pv-entry"><div class="pv-value"><span class="num">${esc(e.value)} ${esc(e.unit)}</span> <span class="pv-item">${esc(e.item)}</span>`
            + ` <button type="button" class="pv-use" data-action="use-panel" data-panel="${esc(e.id)}">${esc(UI.useValue)}</button></div>`
            + e.quotes.map((q) => `<blockquote>“${esc(q)}”</blockquote>`).join('') + '</li>').join('');
        return `<div class="pv-group"><h4>${esc(g.group)}</h4>${src}${shared}<ul class="pv-list">${entries}</ul></div>`;
    }).join('');
    return `<details class="options published" id="published-values"><summary>${esc(UI.headings.panel)}</summary><div class="pv-body">`
        + `<p class="help">${esc(RULED.panelLine1)}</p><p class="help">${esc(RULED.panelLine2)}</p>${groups}`
        + `<p class="help">${esc(UI.scaleStatement)} ${esc(RULED.panelScaleExample)}</p>`
        + `<p class="help num">${esc(UI.panelVersion(PANEL_VERSION))}</p></div></details>`;
}
export function sourceText(source) {
    if (source && typeof source === 'object') {
        const found = panelEntry(source.panel);
        if (found)
            return `${UI.insertedFrom(entryName(found))}; ${RULED.cannotKnow}.`;
    }
    return RULED.usersOwn;
}
function runPanel(state, n) {
    const learn = Boolean(state.learn);
    const units = ['nL', 'pL', UL].map((u) => `<option value="${esc(u)}"${state.pv.unit === u ? ' selected' : ''}>${esc(u)}</option>`).join('');
    const pv = `<div class="pv-block" id="pv-block"><div class="field-row pv-row"><div class="field"><label for="pv-value">${esc(RULED.partitionVolume)}</label>${input('pv.value', state.pv.value, { id: 'pv-value', num: true, desc: [noteId('pv:value'), 'pv-echo', 'pv-declared', 'why-partition-volume'] })}${note('pv:value')}</div>`
        + `<div class="field"><label for="pv-unit">${esc(UI.unit)}</label><select id="pv-unit" class="num" data-bind="pv.unit"${described([noteId('pv:unit'), 'pv-declared', 'why-partition-volume'])}><option value=""${state.pv.unit ? '' : ' selected'}>${esc(UI.choose)}</option>${units}</select>${note('pv:unit')}</div></div>`
        + '<p class="help num" id="pv-echo" data-slot="pv-echo"></p>'
        + `<p class="pv-declared" id="pv-declared">${esc(RULED_1_1.pvDeclared)}</p>`
        + why(RULED.whyPartitionVolume, '', 'partition-volume')
        + `<p class="help" id="pv-source"><b>${esc(UI.block.source)}:</b> <span data-slot="pv-source">${esc(sourceText(state.pv.source))}</span></p>`
        + publishedValues() + '</div>';
    return panel(n, 'run', UI.headings.run, field('instrument', RULED.instrument, input('instrument', state.instrument, { id: 'instrument' }), 'instrument', fold('instrument', why(RULED.whyInstrument, '', 'instrument'), learn))
        + pv
        + field('target', RULED.targetName, input('target', state.target, { id: 'target' }), 'target', fold('target', why(RULED.whyTarget, '', 'target'), learn)));
}
function stepsTable(p, factors) {
    const rows = p.steps.map((s, i) => `<tr data-step="${i}"><td class="idx">${i + 1}</td>`
        + `<td>${input(`step:${p.uid}:${s.uid}:in`, s.in, { num: true, label: `${RULED.volumeIn}, ${UI.stepWord} ${i + 1}`, desc: [noteId(`prep:${p.uid}:step:${i}:in`), noteId(`prep:${p.uid}:step:${i}`), noteId(`prep:${p.uid}:steps`), 'why-dilution'] })}</td>`
        + `<td>${input(`step:${p.uid}:${s.uid}:total`, s.total, { num: true, label: `${RULED.stepTotal}, ${UI.stepWord} ${i + 1}`, desc: [noteId(`prep:${p.uid}:step:${i}:total`), noteId(`prep:${p.uid}:step:${i}`), noteId(`prep:${p.uid}:steps`), 'why-dilution'] })}</td>`
        + `<td class="num factor" data-slot="factor:${p.uid}:${i}">${factors && factors.steps[i] ? `× ${esc(factors.steps[i])}` : ''}</td>`
        + `<td>${p.steps.length > 1 ? `<button type="button" class="remove-row" data-action="remove-step" data-prep="${p.uid}" data-step="${s.uid}" aria-label="${esc(UI.remove)} ${esc(UI.stepWord)} ${i + 1}">×</button>` : ''}</td></tr>`
        + `<tr class="row-note"><td></td><td colspan="4">${note(`prep:${p.uid}:step:${i}:in`)}${note(`prep:${p.uid}:step:${i}:total`)}${note(`prep:${p.uid}:step:${i}`)}</td></tr>`).join('');
    return `<div class="grid-frame steps-frame"><table class="grid steps"><thead><tr><th>#</th><th>${unitHeading(RULED.volumeIn)}</th><th>${unitHeading(RULED.stepTotal)}</th><th>${esc(UI.stepFactor)}</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
        + `<div class="table-foot"><button type="button" class="add" data-action="add-step" data-prep="${p.uid}">${esc(UI.addStep)}</button>`
        + `<span class="help">${esc(UI.overallFactor)} <span class="num" data-slot="overall:${p.uid}">${factors && factors.overall ? `× ${esc(factors.overall)}` : ''}</span></span></div></div>${note(`prep:${p.uid}:steps`)}`;
}
function prepBlock(state, p, i, factors) {
    const learn = Boolean(state.learn);
    const k = `prep:${p.uid}`;
    const first = i === 0;
    const dilutionBody = p.kind === 'steps' ? stepsTable(p, factors) + `<div class="visual-slot" data-slot="tubes:${p.uid}"></div>`
        : p.kind === 'factor' ? field(`factor-${p.uid}`, RULED.oneFactor, input(`prep:${p.uid}:factor`, p.factor, { id: `factor-${p.uid}`, num: true }), `${k}:factor`, '', ['why-dilution']) : '';
    return `<div class="prep-block" data-prep="${p.uid}">`
        + `<div class="prep-head"><h3>${esc(UI.preparation)} <span class="num">${esc(prepName(state, p))}</span></h3>`
        + (state.preps.length > 1 ? `<button type="button" class="remove-row" data-action="remove-prep" data-prep="${p.uid}">${esc(UI.removePreparation)}</button>` : '') + '</div>'
        + `<div class="field prep-name"><label for="name-${p.uid}">${esc(UI.preparationName)}</label>${input(`prep:${p.uid}:name`, p.name, { id: `name-${p.uid}` })}${note(`${k}:name`)}</div>`
        + radios(`kind-${p.uid}`, `prep:${p.uid}:kind`, { none: RULED.notDiluted, steps: RULED.dilutionSteps, factor: RULED.oneFactor }, p.kind, UI.dilutionLegend, `${k}:kind`, first ? fold('dilution', why(RULED.whyDilution, '', 'dilution'), learn) : '', first ? [] : ['why-dilution'])
        + dilutionBody
        + field(`total-${p.uid}`, `${RULED.total} (${UL})`, input(`prep:${p.uid}:total`, p.total, { id: `total-${p.uid}`, num: true }), `${k}:total`, '', [`help-reaction-${p.uid}`, 'why-reaction'])
        + field(`sample-${p.uid}`, `${RULED.sample} (${UL})`, input(`prep:${p.uid}:sample`, p.sample, { id: `sample-${p.uid}`, num: true }), `${k}:sample`, '', [`help-reaction-${p.uid}`, 'why-reaction'])
        + `<div class="field"><label for="mix-${p.uid}">${esc(RULED.mix.replace(/ \(µL\)$/, ''))} (${UL}) <span class="optional">${esc(UI.optional)}</span></label>${input(`prep:${p.uid}:mix`, p.mix, { id: `mix-${p.uid}`, num: true, desc: [noteId(`${k}:mix`), `help-reaction-${p.uid}`] })}${note(`${k}:mix`)}</div>`
        + `<p class="help" id="help-reaction-${p.uid}">${esc(RULED.reactionExample)}</p>`
        + `<div class="visual-slot" data-slot="bar:${p.uid}"></div>`
        + (first ? fold('reaction', why(RULED.whyReaction, '', 'reaction'), learn) : '')
        + '</div>';
}
function prepsPanel(state, n, factorsByPrep) {
    return panel(n, 'preparations', UI.headings.preparations, `<p class="help">${esc(RULED.preparationDefinition)} ${esc(RULED.sameSample)}</p>`
        + state.preps.map((p, i) => prepBlock(state, p, i, factorsByPrep[p.uid])).join('')
        + `<div class="button-row"><button type="button" class="add" data-action="add-prep">${esc(UI.addPreparation)}</button></div>${note('preparations')}`);
}
function pasteSteps(state) {
    const p = state.paste;
    const split = splitPaste(p.text, p.headerRow);
    const columnOptions = (key) => `<option value=""${p.mapping[key] === null ? ' selected' : ''}>${esc(UI.choose)}</option>`
        + Array.from({ length: split.columns }, (_, i) => `<option value="${i}"${p.mapping[key] === i ? ' selected' : ''}>${esc(UI.column(i, split.headers ? (split.headers[i] || '').trim() : ''))}</option>`).join('');
    const numberOption = (key) => (key === 'well' ? `<option value="number"${p.mapping.well === 'number' ? ' selected' : ''}>${esc(UI.numberWells)}</option>` : '');
    const map = (key, label) => `<label class="field"><span class="label">${esc(label)}</span><select data-bind="paste.mapping.${key}"${described([noteId('paste:mapping')])}>${columnOptions(key)}${numberOption(key)}</select></label>`;
    return `<div class="paste stack" id="paste-area">`
        + `<div class="field"><label for="paste-text">${esc(UI.pasteLabel)}</label><textarea id="paste-text" class="num" rows="5" spellcheck="false" autocomplete="off" data-bind="paste.text">${esc(p.text)}</textarea>${note('paste:text')}</div>`
        + radios('separator', 'paste.separator', UI.separatorOptions, p.separator, UI.separatorLegend, 'paste:separator', `<p class="help" id="help-separator-scope">${esc(UI.separatorScope)}</p>${fold('separator', why(RULED.whySeparator, '', 'separator'), Boolean(state.learn))}`)
        + radios('header-row', 'paste.headerRow', UI.headerOptions, p.headerRow, UI.headerLegend, 'paste:header')
        + `<div class="field"><span class="label">${esc(UI.mappingHeading)}</span><p class="help">${esc(UI.mappingHelp)}</p><div class="mapping">`
        + map('well', UI.wellColumn) + map('positive', RULED.positive) + map('accepted', UI.acceptedShort) + `</div>${note('paste:mapping')}</div>`
        + `<div class="button-row"><button type="button" data-action="type-instead">${esc(UI.typeInstead)}</button></div></div>`;
}
function wellsPanel(state, n) {
    const pasted = state.entry === 'pasted';
    const rows = wellRows(state);
    const prepOptions = (w) => (state.preps.length === 1
        ? `<option value="${esc(state.preps[0].uid)}" selected>${esc(prepName(state, state.preps[0]))}</option>`
        : `<option value=""${w.prep ? '' : ' selected'}>${esc(UI.choose)}</option>` + state.preps.map((p) => `<option value="${esc(p.uid)}"${w.prep === p.uid ? ' selected' : ''}>${esc(prepName(state, p))}</option>`).join(''));
    const bind = (w, i, k) => (pasted ? `pwell:${i}:${k}` : `well:${w.uid}:${k}`);
    const body = rows.map((w, i) => `<tr data-well="${i}"><td class="idx">${i + 1}</td>`
        + `<td>${input(bind(w, i, 'label'), w.label, { label: `${UI.wellColumn} ${i + 1}`, readonly: pasted })}</td>`
        + `<td><select class="num" data-bind="${bind(w, i, 'prep')}"${described([noteId(`well:${i}:prep`)])} aria-label="${esc(UI.preparation)}, ${esc(UI.wellColumn)} ${i + 1}">${prepOptions(w)}</select></td>`
        + `<td>${input(bind(w, i, 'positive'), w.positive, { num: true, mode: 'numeric', label: `${RULED.positive}, ${UI.wellColumn} ${i + 1}`, readonly: pasted, desc: [noteId(`well:${i}:counts`), noteId(`well:${i}:positive`), 'why-counts'] })}</td>`
        + `<td>${input(bind(w, i, 'accepted'), w.accepted, { num: true, mode: 'numeric', label: `${UI.acceptedShort}, ${UI.wellColumn} ${i + 1}`, readonly: pasted, desc: [noteId(`well:${i}:counts`), noteId(`well:${i}:accepted`), 'help-accepted', 'why-counts'] })}</td>`
        + `<td class="tick"><input type="checkbox" data-bind="${bind(w, i, 'inMean')}"${w.inMean ? ' checked' : ''}${described(['why-replicates'])} aria-label="${esc(RULED.includeInMean)}, ${esc(UI.wellColumn)} ${i + 1}"></td>`
        + `<td>${pasted ? '' : `<button type="button" class="remove-row" data-action="remove-well" data-well="${w.uid}" aria-label="${esc(UI.remove)} ${esc(UI.wellColumn)} ${i + 1}">×</button>`}</td></tr>`
        + `<tr class="row-note"><td></td><td colspan="6">${['label', 'prep', 'counts', 'positive', 'accepted', 'row'].map((k) => note(`well:${i}:${k}`)).join('')}</td></tr>`).join('');
    const table = `<div class="grid-frame wells-frame"><table class="grid wells"><thead><tr><th>#</th><th>${esc(UI.wellColumn)}</th><th>${esc(UI.preparation)}</th><th>${esc(RULED.positive)}</th><th>${esc(UI.acceptedShort)}</th><th>${esc(UI.inMeanColumn)}</th><th></th></tr></thead><tbody>${body}</tbody></table>`
        + `<div class="table-foot">${pasted ? `<span class="help">${esc(UI.pastedRowsNote)}</span>` : `<button type="button" class="add" data-action="add-well">${esc(UI.addWell)}</button><span class="help">${esc(UI.pasteHint)}</span>`}</div></div>`;
    return panel(n, 'wells', UI.headings.wells, `<p class="help">${esc(RULED.partitionDefinition)}</p>`
        + `<p class="help" id="help-accepted">${esc(RULED.acceptedFull)}.</p>`
        + fold('counts', why(RULED.whyCounts, '', 'counts'), Boolean(state.learn))
        + (pasted ? pasteSteps(state) : '')
        + table + note('wells')
        + fold('replicates', why(RULED.whyReplicates, '', 'replicates'), Boolean(state.learn))
        + `<div class="field-row"><div class="field"><label for="expected">${esc(UI.expected)}</label>${input('expected', state.expected, { id: 'expected', num: true, mode: 'numeric', desc: [noteId('expected')] })}${note('expected')}</div>`
        + `<div class="field"><label for="expected-source">${esc(UI.valueSource)}</label>${input('expectedSource', state.expectedSource, { id: 'expected-source' })}</div></div>`);
}
function titerPanel(state, n) {
    const t = state.titre;
    const learn = Boolean(state.learn);
    const sw = `<label class="switch"><input type="checkbox" id="titer-switch" data-bind="titer"${state.titer ? ' checked' : ''}> <span>${esc(state.titer ? UI.on : UI.off)}</span></label>`;
    if (!state.titer)
        return panel(n, 'titer', UI.headings.titer, '', sw);
    const zin = `<span class="cite">${esc(RULED.zinCitation)}</span>`;
    const body = `<p class="help">${esc(RULED.titerIntro)}</p>`
        + radios('dnase', 'titre.dnase', RULED.freeDnaOptions, t.dnase, RULED.freeDna, 'titre:dnase', (t.dnase === 'other' ? field('dnase-text', UI.methodLabel, input('titre.dnaseText', t.dnaseText, { id: 'dnase-text' }), 'titre:dnaseText') : '')
            + why(RULED.whyFreeDna, `${esc(UI.sourcePrefix)} ${esc(RULED.whyFreeDnaSource)}.`, 'free-dna'))
        + radios('lysis', 'titre.lysis', RULED.lysisOptions, t.lysis, UI.lysisLegend, 'titre:lysis', field('lysis-text', RULED.lysisConditions, input('titre.lysisText', t.lysisText, { id: 'lysis-text' }), 'titre:lysisText')
            + fold('lysis', why(RULED.whyLysis, `${esc(UI.sourcePrefix)} ${esc(UI.zinAbstract)} “${esc(RULED.whyLysisSourceStart)}”. ${zin}`, 'lysis'), learn))
        + `<div class="titer-order-slot" data-slot="titer-order">${titerOrderHtml(caseOf(state).titre)}</div>`
        + radios('target-class', 'titre.targetClass', RULED.classOptions, t.targetClass, UI.classLegend, 'titre:class', (t.targetClass === 'other' ? field('class-text', UI.classTextLabel, input('titre.targetClassText', t.targetClassText, { id: 'class-text' }), 'titre:classText') : '')
            + fold('class', why(RULED.whyClass, '', 'class'), learn))
        + `<p class="help">${esc(RULED.twoTargets)}</p>`
        + `<div class="field-row"><div class="field"><label for="ratio">${esc(RULED.ratioLimit)}</label>${input('titre.ratio', t.ratio, { id: 'ratio', num: true, desc: [noteId('titre:ratio')] })}${note('titre:ratio')}</div>`
        + `<div class="field"><label for="ratio-source">${esc(UI.valueSource)}</label>${input('titre.ratioSource', t.ratioSource, { id: 'ratio-source' })}</div></div>`
        + `<fieldset class="field"><legend class="label">${esc(RULED.workingRange)}</legend><div class="range-row">`
        + `${input('titre.low', t.low, { num: true, label: UI.recordRange.low, desc: [noteId('titre:low'), noteId('titre:range')] })}<span>${esc(UI.rangeTo)}</span>${input('titre.high', t.high, { num: true, label: UI.recordRange.high, desc: [noteId('titre:high'), noteId('titre:range')] })}</div>`
        + `${note('titre:low')}${note('titre:high')}${note('titre:range')}</fieldset>`
        + `<div class="field"><label for="range-source">${esc(UI.valueSource)}</label>${input('titre.rangeSource', t.rangeSource, { id: 'range-source' })}</div>`;
    return panel(n, 'titer', UI.headings.titer, body, sw);
}
export function formHtml(state, factorsByPrep = {}, learnConfirming = false) {
    return learnPanelHtml(state, learnConfirming) + runPanel(state, 1) + prepsPanel(state, 2, factorsByPrep) + wellsPanel(state, 3) + titerPanel(state, 4);
}
