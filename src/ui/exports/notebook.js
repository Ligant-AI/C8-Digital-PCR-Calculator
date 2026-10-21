import { UI, RULED } from '../text.js';
const L = () => UI.exp;
export function entryLines(record) {
    const out = [`${RULED.partitionVolume}: ${record.inputs.partitionVolume.echo}`, `${UI.block.source}: ${record.declarations.partitionVolumeSource.text}`];
    for (const p of record.inputs.preparations) {
        const reaction = UI.block.prepLine({ total: p.total.entered, sample: p.sample.entered, mix: p.mix ? p.mix.entered : '', dilution: p.dilution.label });
        let dil = '';
        if (p.dilution.kind === 'steps')
            dil = `; ${p.dilution.steps.map((s) => `${s.in.entered} µL into ${s.total.entered} µL`).join(', ')}`;
        if (p.dilution.kind === 'factor')
            dil = ` ${p.dilution.factor}`;
        out.push(`${p.name}: ${reaction}${dil}`);
    }
    return out;
}
export function declarationLines(record) {
    const d = record.declarations;
    const out = [`${L().mode}: ${record.mode === 'titer' ? L().titer : L().base}`];
    if (record.entry.decimalSeparator)
        out.push(`${UI.block.separator}: ${record.entry.decimalSeparator}`);
    out.push(`${RULED.instrument}: ${d.instrument}`, `${RULED.targetName}: ${d.targetName}`);
    const s = d.partitionVolumeSource;
    out.push(`${UI.block.source}: ${s.text}`);
    if (s.kind === 'published') {
        out.push(`  ${s.platform}, ${s.item}; ${s.source}, ${s.url}${s.read ? `, read ${s.read}` : ''}`);
        for (const q of s.quotes)
            out.push(`  "${q}"`);
        out.push(`  ${L().panelVersion}: ${s.panelVersion}`);
    }
    if (d.expectedAccepted)
        out.push(`${UI.block.expected}: ${d.expectedAccepted.entered} (${d.expectedAccepted.source})`);
    if (d.titer) {
        const t = d.titer;
        out.push(`${RULED.freeDna}: ${t.freeDna.answer}${t.freeDna.method ? `: ${t.freeDna.method}` : ''}`);
        out.push(`${UI.lysisLegend}: ${t.capsidOpening.answer}${t.capsidOpening.conditions ? `; ${t.capsidOpening.conditions}` : ''}`);
        out.push(`${UI.classLegend}: ${t.targetClass}`);
        if (t.ratioLimit)
            out.push(`${UI.block.limit}: ${t.ratioLimit.entered} (${t.ratioLimit.source})`);
        if (t.workingRange)
            out.push(`${UI.block.range}: ${t.workingRange.low} ${UI.rangeTo} ${t.workingRange.high} ${UI.rangeUnit} (${t.workingRange.source})`);
    }
    return out;
}
const C = () => L().csvColumns;
function wellLine(w) {
    const parts = [`${C().p} ${w.p.display}`];
    if (w.status === 'computed') {
        parts.push(`${C().lambda} ${w.lambda.display}`, `${C().cRxn} ${w.cRxn.display}`, `${C().ratio} ${w.ratio.display}`);
        if (w.factors.length)
            parts.push(`${C().factors} ${w.factors.map((f) => f.display).join(' × ')}`);
        parts.push(`${C().F} ${w.F.display}`, `${C().cDil} ${w.cDil.display}`);
    }
    parts.push(`${C().cOrig} ${w.cOrig.display}`, `${C().perMl} ${w.perMl.display}`);
    return parts.join('; ');
}
export function notebookText(record) {
    const t = record.tool;
    const lines = [t.name, ...t.scope, `${L().date}: ${t.date} | ${L().toolVersion} ${t.version} | ${UI.engineVersion(t.engine)} | ${L().order} ${t.orderOfEvaluation}`, `${L().url}: ${t.url}`, ''];
    const S = L().sections;
    const r = record.result;
    lines.push(S.result, r.label);
    if (r.labelLine)
        lines.push(r.labelLine);
    if (r.recordLabel)
        lines.push(r.recordLabel);
    if (r.mean && r.mean.status === 'computed') {
        lines.push(`${L().meanRow} (${r.mean.words}): ${r.mean.cOrig.display} ${C().cOrig}; ${r.mean.perMl.display} ${C().perMl}`);
        lines.push(`${L().meanIncludes}: ${r.mean.wells.join(', ')} (${r.mean.preparations.join(', ')})${r.mean.notIncluded.length ? `; ${L().meanExcludes}: ${r.mean.notIncluded.join(', ')}` : ''}`);
        lines.push(r.mean.sentence);
    }
    else if (r.mean)
        lines.push(r.mean.words);
    lines.push('', S.wells);
    for (const w of r.wells)
        lines.push(`${w.well} (${w.prep}): ${L().counts(w.positive, w.accepted)}; ${w.inMean ? UI.inMeanCell : RULED.notInMean}${w.flags.length ? `; ${w.flags.join(' ')}` : ''}`, `  ${wellLine(w)}`);
    lines.push('', S.working);
    for (const w of r.wells) {
        lines.push(w.well);
        for (const [a, b] of w.working)
            lines.push(`  ${a} ${b}`);
    }
    if (r.wells.some((w) => w.working.length))
        lines.push(UI.working.wellNote);
    if (r.mean && r.mean.working) {
        lines.push(L().meanRow);
        for (const [a, b] of r.mean.working)
            lines.push(`  ${a} ${b}`);
    }
    lines.push('', S.flags, ...(record.flags.length ? record.flags.flatMap((f) => f.words.map((wd) => `${f.code} ${wd}`)) : [L().noFlags]));
    lines.push('', S.inputs, ...entryLines(record));
    lines.push('', S.declarations, ...declarationLines(record));
    const c = record.constants;
    lines.push('', S.constants, `${c.poisson.relation}. ${c.poisson.source}: "${c.poisson.quote}" ${c.poisson.mapping}`);
    lines.push(record.display.precision, ...(record.entry.decimalSeparator === ',' ? [UI.commaEntries] : []), record.display.rounding);
    lines.push('', S.register, ...record.register.map((x) => `${x.item}: ${x.value}. ${x.basis}${x.labelledAs ? ` ${x.labelledAs}` : ''} ${L().appliesTo}: ${x.appliesTo}. (${x.status})`), ...record.assumptions.map((x) => `${x.assumption} (${x.appliesTo}; ${x.status})`));
    lines.push('', S.citation, t.citation, '');
    return lines.join('\n');
}
