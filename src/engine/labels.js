export const BASE_UNIT = 'copies per mL of the original sample';
export const DNASE_LINE = 'no DNase step declared: free DNA in the sample is counted as genome copies';
const CLASS_NAMES = { itr: 'ITR', transgene: 'Transgene' };
export function labelOf(c) {
    if (c.mode !== 'titre')
        return { unit: BASE_UNIT, target: c.targetName, line: null };
    const t = c.titre;
    const target = t.targetClass === 'other' ? (t.targetClassText ?? '') : CLASS_NAMES[t.targetClass];
    if (t.dnase === 'yes')
        return { unit: 'vector genomes per mL (vg/mL), DNase-treated', target, line: null };
    if (t.dnase === 'other')
        return { unit: `vector genomes per mL (vg/mL), free DNA removed or blocked by ${t.dnaseText}`, target, line: null };
    return { unit: 'genome copies per mL (GC/mL)', target, line: DNASE_LINE };
}
export function headlineOf(label) {
    return `${label.unit}, ${label.target} target`;
}
const LYSIS_PHRASE = {
    'proteinase-k': () => 'capsids opened with proteinase K',
    heat: (t) => `capsids opened by a heat step before PCR${t.lysisText ? ` (${t.lysisText})` : ''}`,
    'pcr-start': () => "capsids opened by the PCR's initial 95 °C step",
    other: (t) => `capsids opened by ${t.lysisText ?? 'another method'}`,
    'not-known': () => 'capsid opening not known',
};
export function recordLabelOf(c, meanCount) {
    if (c.mode !== 'titre')
        return null;
    const t = c.titre;
    const label = labelOf(c);
    const short = t.dnase === 'yes' ? 'vg/mL, DNase-treated' : t.dnase === 'other' ? `vg/mL, free DNA removed or blocked by ${t.dnaseText}` : 'GC/mL';
    const parts = [`${short}, ${label.target} target`, LYSIS_PHRASE[t.lysis](t)];
    if (meanCount)
        parts.push(`mean of ${meanCount} wells`);
    return parts.join('; ');
}
