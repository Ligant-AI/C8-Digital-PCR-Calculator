import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPARED_ENGINE_VERSIONS } from '../src/ui/exports/register.js';
const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA_FILE = 'ligant-benchtools-record-1.0.0.schema.json';
const ROOT = [process.argv[2], HERE, join(HERE, '..')].filter(Boolean).find((d) => existsSync(join(d, SCHEMA_FILE)) && existsSync(join(d, 'examples')));
if (!ROOT) {
    console.log(`No ${SCHEMA_FILE} with an examples/ folder beside it found. Give the folder as the first argument.`);
    process.exit(1);
}
const ANNOTATIONS = new Set(['$schema', '$id', 'title', 'description', '$defs']);
const KNOWN = new Set(['$ref', 'type', 'const', 'enum', 'required', 'properties', 'additionalProperties', 'items', 'minItems', 'maxItems', 'minLength', 'pattern', 'minimum', 'allOf', 'anyOf', 'oneOf', 'if', 'then', 'else']);
const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
const typeOk = (t, v) => (t === 'number' ? typeof v === 'number' && Number.isFinite(v) : t === 'integer' ? Number.isInteger(v) : typeOf(v) === t);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function validate(schema, value) {
    const root = schema;
    const resolve = (ref) => ref.replace(/^#\//, '').split('/').reduce((o, k) => o[k], root);
    const walk = (s, v, path) => {
        const errs = [];
        if (s === true || (s && Object.keys(s).length === 0))
            return errs;
        for (const k of Object.keys(s))
            if (!KNOWN.has(k) && !ANNOTATIONS.has(k))
                throw new Error(`validator: unsupported keyword ${k} at ${path}`);
        if (s.$ref)
            errs.push(...walk(resolve(s.$ref), v, path));
        if (s.type) {
            const ts = [].concat(s.type);
            if (!ts.some((t) => typeOk(t, v)))
                return [...errs, `${path}: type ${typeOf(v)}, expected ${ts.join('|')}`];
        }
        if ('const' in s && !equal(s.const, v))
            errs.push(`${path}: not ${JSON.stringify(s.const)}`);
        if (s.enum && !s.enum.some((e) => equal(e, v)))
            errs.push(`${path}: ${JSON.stringify(v)} not in enum`);
        if (typeof v === 'string') {
            if (s.minLength !== undefined && [...v].length < s.minLength)
                errs.push(`${path}: shorter than ${s.minLength}`);
            if (s.pattern && !new RegExp(s.pattern, 'u').test(v))
                errs.push(`${path}: ${JSON.stringify(v)} does not match ${s.pattern}`);
        }
        if (typeof v === 'number' && s.minimum !== undefined && v < s.minimum)
            errs.push(`${path}: below ${s.minimum}`);
        if (Array.isArray(v)) {
            if (s.minItems !== undefined && v.length < s.minItems)
                errs.push(`${path}: fewer than ${s.minItems} items`);
            if (s.maxItems !== undefined && v.length > s.maxItems)
                errs.push(`${path}: more than ${s.maxItems} items`);
            if (s.items)
                v.forEach((x, i) => errs.push(...walk(s.items, x, `${path}[${i}]`)));
        }
        if (typeOf(v) === 'object') {
            for (const k of s.required || [])
                if (!(k in v))
                    errs.push(`${path}: missing ${k}`);
            for (const [k, sub] of Object.entries(s.properties || {}))
                if (k in v)
                    errs.push(...walk(sub, v[k], `${path}.${k}`));
            if (s.additionalProperties === false)
                for (const k of Object.keys(v))
                    if (!(k in (s.properties || {})))
                        errs.push(`${path}: unexpected ${k}`);
        }
        for (const sub of s.allOf || [])
            errs.push(...walk(sub, v, path));
        if (s.anyOf && !s.anyOf.some((sub) => walk(sub, v, path).length === 0))
            errs.push(`${path}: matches no anyOf branch`);
        if (s.oneOf) {
            const results = s.oneOf.map((sub) => walk(sub, v, path));
            const n = results.filter((r) => r.length === 0).length;
            if (n !== 1)
                errs.push(n === 0 ? `${path}: matches no oneOf branch (${results.map((r) => r[0]).join(' / ')})` : `${path}: matches ${n} oneOf branches`);
        }
        if (s.if) {
            const holds = walk(s.if, v, path).length === 0;
            if (holds && s.then)
                errs.push(...walk(s.then, v, path));
            if (!holds && s.else)
                errs.push(...walk(s.else, v, path));
        }
        return errs;
    };
    return walk(schema, value, '$');
}
const FORBIDDEN = [
    [/\b(T1|C[0-9]+)-(FL|HI|IN|TM|EX|ST|UN|DT|PV|FX|AT|LN|CN)-?[0-9]*/u, 'an internal requirement or fixture code'],
    [/\bNAD-[0-9]/u, 'a ruling id'],
    [/\bQ-[A-Z]{2}-[0-9]/u, 'a question id'],
    [new RegExp('\\u2014', 'u'), 'an em dash'],
    [/μ/u, 'the Greek letter mu'],
];
export function crossCheck(rec, rawText) {
    const errs = [];
    for (const [re, what] of FORBIDDEN)
        if (re.test(rawText))
            errs.push(`contains ${what}: ${rawText.match(re)[0]}`);
    const ids = new Map();
    for (const [list, kind] of [[rec.declarations, 'declaration'], [rec.constants, 'constant'], [rec.inputs, 'input'], [rec.results, 'result']]) {
        for (const x of (list || []).filter((y) => y && typeof y === 'object')) {
            if (ids.has(x.id))
                errs.push(`id ${x.id} used twice`);
            ids.set(x.id, kind);
        }
    }
    const must = (id, kinds, where) => { if (!kinds.includes(ids.get(id)))
        errs.push(`${where}: ${id} does not resolve to a ${kinds.join(' or ')}`); };
    for (const x of rec.inputs || [])
        for (const id of x.restsOn)
            must(id, ['declaration', 'constant'], `input ${x.id}`);
    for (const x of (rec.results || []).filter(Boolean))
        for (const id of x.restsOn || [])
            must(id, ['declaration', 'constant'], `result ${x.id}`);
    for (const x of rec.declarations || [])
        if (x.basis && x.basis.constant)
            must(x.basis.constant, ['constant'], `declaration ${x.id}`);
    for (const f of rec.flags || [])
        for (const id of f.results)
            must(id, ['result'], `flag ${f.code}`);
    const comma = ((rec.declarations || []).find((d) => d && d.id === 'decimal-separator') || {}).value === ',';
    const commaEntries = comma ? (rec.inputs || []).filter((i) => i && i.entered.includes(',')).map((i) => i.entered.trim()) : [];
    for (const x of (rec.results || []).filter((y) => y && y.working)) {
        for (const tok of x.working.match(/(?<![0-9.,])[0-9]+(?:,[0-9]+)+(?:\.[0-9]+)?/gu) || []) {
            if (!/^[1-9][0-9]{0,2}(,[0-9]{3})+(\.[0-9]+)?$/u.test(tok))
                errs.push(`result ${x.id}: working writes ${tok} with a comma as its decimal mark`);
        }
        for (const e of commaEntries)
            if (new RegExp(`(?<![0-9.,])${e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![0-9])`, 'u').test(x.working))
                errs.push(`result ${x.id}: working repeats the entry ${e} with its comma`);
    }
    const codes = (rec.flags || []).map((f) => f.code);
    if (codes.join() !== [...codes].sort().join())
        errs.push('flags not in code order');
    const t = rec.tool || {};
    if (rec.madeWith && rec.madeWith.suiteId === 'C8') {
        for (const p of t.preparations || []) {
            must(p.dilution, ['declaration'], `preparation ${p.name}`);
            for (const id of p.inputs)
                must(id, ['input'], `preparation ${p.name}`);
            for (const id of p.results)
                must(id, ['result'], `preparation ${p.name}`);
        }
        const preps = new Set((t.preparations || []).map((p) => p.name));
        for (const w of t.wells || []) {
            if (!preps.has(w.preparation))
                errs.push(`well ${w.name}: preparation ${w.preparation} not listed`);
            for (const id of w.inputs)
                must(id, ['input'], `well ${w.name}`);
            for (const id of w.results)
                must(id, ['result'], `well ${w.name}`);
            for (const c of w.flags)
                if (!codes.includes(c))
                    errs.push(`well ${w.name}: flag ${c} not raised`);
            const named = (rec.flags || []).filter((f) => f.names.includes(w.name)).map((f) => f.code);
            if (named.join() !== w.flags.join())
                errs.push(`well ${w.name}: lists flags ${w.flags.join(', ') || 'none'}, but the flags naming it are ${named.join(', ') || 'none'}`);
            if (w.status === 'undefined') {
                for (const k of ['lambda', 'copies-per-ul-reaction', 'copies-per-ul-diluted']) {
                    const r = (rec.results || []).find((x) => x && x.id === `${k}:${w.name}`);
                    if (!r || r.display !== null || r.unrounded !== null)
                        errs.push(`undefined well ${w.name}: ${k} must be an object with null members`);
                }
                for (const k of ['copies-per-ul-original', 'copies-per-ml-original']) {
                    const r = (rec.results || []).find((x) => x && x.id === `${k}:${w.name}`);
                    if (!r || r.display !== 'undefined, not a measurement')
                        errs.push(`undefined well ${w.name}: ${k} must read "undefined, not a measurement"`);
                }
            }
        }
        if (t.mean)
            for (const id of t.mean.results)
                must(id, ['result'], 'mean');
        const rr = (rec.constants || []).find((x) => x && x.id === 'rounding-rule');
        if (rr && rr.basis !== 'No intermediate value is rounded to display precision; each is carried as a double.')
            errs.push(`rounding-rule basis is "${rr.basis}"`);
        const ratio = (rec.results || []).find((x) => x && x.id === 'highest-to-lowest');
        const fl08 = (rec.flags || []).find((f) => f.code === 'FL-08');
        if (fl08 && ratio && ratio.display === 'no finite value') {
            const zero = (t.wells || []).filter((w) => w.inMean && ((rec.results || []).find((x) => x && x.id === `copies-per-ul-original:${w.name}`) || {}).display === '0').map((w) => w.name);
            if (fl08.names.join('\n') !== zero.join('\n'))
                errs.push(`FL-08 zero form names ${fl08.names.join(', ')}, not only the wells at 0 (${zero.join(', ')})`);
        }
        for (const x of (rec.inputs || []).filter((i) => /^(positive|accepted):/.test(i.id)))
            if (!(t.wells || []).some((w) => w.name === x.of))
                errs.push(`input ${x.id}: no such well`);
        const a = (rec.constants || []).find((x) => x && x.id === 'agreement-between-implementations');
        if (COMPARED_ENGINE_VERSIONS.includes(rec.madeWith.engineVersion)) {
            if (!a || a.status !== 'characterised' || a.appliesTo !== 'Every result')
                errs.push('agreement row');
        }
        else if (a)
            errs.push('agreement row for an engine version not compared');
    }
    return errs;
}
const schema = JSON.parse(readFileSync(join(ROOT, 'ligant-benchtools-record-1.0.0.schema.json'), 'utf8'));
const schemaText = readFileSync(join(ROOT, 'ligant-benchtools-record-1.0.0.schema.json'), 'utf8');
let bad = 0;
for (const [re, what] of FORBIDDEN.slice(0, 4))
    if (re.test(schemaText)) {
        bad++;
        console.log(`schema contains ${what}`);
    }
const files = readdirSync(join(ROOT, 'examples')).filter((f) => f.endsWith('.json')).sort();
const records = {};
for (const f of files) {
    const raw = readFileSync(join(ROOT, 'examples', f), 'utf8');
    const rec = JSON.parse(raw);
    records[f] = rec;
    const errs = [...validate(schema, rec), ...crossCheck(rec, raw)];
    console.log(`${errs.length ? 'FAIL' : 'PASS'}  ${f}${errs.length ? `\n      ${errs.slice(0, 8).join('\n      ')}` : ''}`);
    if (errs.length)
        bad++;
}
const clone = (x) => JSON.parse(JSON.stringify(x));
const SCOPE_START = "For data from droplet and chamber-based digital PCR instruments, using the partition volume you declare. The positive and accepted partitions are the counts your instrument's software gives:";
const ROUNDING_TEXT = "The tool rounds to the digits shown only for display. Every later step uses the unrounded value, held at the computer's full precision of about 16 significant digits, which is a limit of the arithmetic, not of the measurement. Multiplying the shown values by hand can therefore differ from the result in the last digits.";
const TITER_SCOPE = 'Titer mode is for DNA-genome vector lots, such as AAV. It does not cover RNA-genome vectors measured by RT-ddPCR, such as lentiviral lots.';
for (const [f, rec] of Object.entries(records)) {
    const errs = [];
    const c = (id) => rec.constants.find((x) => x.id === id);
    const titer = rec.declarations.some((d) => d.id === 'mode' && d.value === 'titer');
    if (!rec.statements.scope.startsWith(SCOPE_START))
        errs.push('scope words');
    if (rec.precision.rounding !== ROUNDING_TEXT)
        errs.push('rounding sentence');
    if ((c('rounding-rule') || {}).basis !== 'No intermediate value is rounded to display precision; each is carried as a double.')
        errs.push('rounding-rule basis');
    if (JSON.stringify(rec).includes('No intermediate value is rounded.'))
        errs.push('the superseded rounding basis');
    if (rec.statements.scope.includes(TITER_SCOPE) !== titer)
        errs.push('titer scope sentence present in the wrong mode');
    if (!c('template-ratio-relation').basis.startsWith('Derivation: the sample is mixed into the whole reaction') || !(c('template-ratio-relation').labelledAs || '').startsWith("Ligant's reading: Addgene's titer protocol"))
        errs.push('template-ratio texts');
    if (!c('copies-per-reaction-relation').basis.startsWith('Derivation: lambda is the mean number of copies per partition'))
        errs.push('copies-per-reaction basis');
    if (!c('lambda-evaluation').basis.startsWith('−log1p(−p) gives the same quantity'))
        errs.push('lambda basis');
    const dl = (id) => (rec.declarations.find((d) => d.id === id) || {});
    if (dl('mode').label !== 'Titer mode' || dl('mode').text !== (titer ? 'on' : 'off'))
        errs.push('mode label or text');
    if (dl('data-entry').label !== 'How will you enter the counts?' || !['Type them into the table', 'Paste a table from a spreadsheet or instrument export'].includes(dl('data-entry').text))
        errs.push('data-entry label or text');
    if (dl('decimal-separator').label !== 'Decimal separator')
        errs.push('decimal-separator label');
    if (rec.declarations.some((d) => d.id.startsWith('dilution:') && d.label !== 'Dilution before PCR'))
        errs.push('dilution label');
    if (rec.declarations.some((d) => d.id === 'free-dna-method' && d.label !== 'Free DNA removed before PCR: method'))
        errs.push('free-dna-method label');
    if (c('zin-2025') || rec.constants.some((x) => x.kind === 'reference'))
        errs.push('Zin row still present');
    if (titer && rec.declarations.some((d) => d.id === 'capsid-opening-conditions') && !rec.results.filter((r) => r.unit).every((r) => r.restsOn.includes('capsid-opening-conditions')))
        errs.push('conditions missing from restsOn');
    console.log(`${errs.length ? 'FAIL' : 'PASS'}  ruled texts: ${f}${errs.length ? `  (${errs.join('; ')})` : ''}`);
    if (errs.length)
        bad++;
}
function notComputed(from, outcome, edit) {
    const r = clone(from);
    r.outcome = { status: outcome.status, words: outcome.words, missing: outcome.missing || [], refusals: [], notSupported: outcome.notSupported || [], message: null };
    r.results = [];
    r.flags = [];
    r.tool.label = null;
    r.tool.headline = null;
    r.tool.recordLabel = null;
    r.tool.mean = null;
    r.tool.preparations.forEach((p) => { p.results = []; });
    r.tool.wells.forEach((w) => { w.status = 'not-computed'; w.results = []; w.flags = []; });
    edit(r);
    return r;
}
const POSITIVE = [
    ['an incomplete analysis', notComputed(records['worked-example.json'], { status: 'incomplete', words: 'No result yet', missing: ['Instrument and software version', 'The unit of the partition volume'] }, (r) => {
            r.declarations = r.declarations.filter((d) => d.id !== 'instrument');
            const pv = r.inputs.find((i) => i.id === 'partition-volume');
            pv.unit = null;
            pv.converted = null;
        })],
    ['an incomplete analysis with an empty field', notComputed(records['normal-result.json'], { status: 'incomplete', words: 'No result yet', missing: ['Volume of sample (template) added to that reaction'] }, (r) => {
            r.inputs.find((i) => i.id === 'sample:P1').entered = '';
        })],
    ['an unsupported case', notComputed(records['normal-result.json'], { status: 'unsupported', words: 'No result: this case is not supported', notSupported: ['This unit is not offered. Enter the partition volume in nL, pL or µL, and every other volume in µL.'] }, () => { })],
];
for (const [name, rec] of POSITIVE) {
    const errs = [...validate(schema, rec), ...crossCheck(rec, JSON.stringify(rec))];
    console.log(`${errs.length ? 'FAIL' : 'PASS'}  built record: ${name}${errs.length ? `\n      ${errs.slice(0, 6).join('\n      ')}` : ''}`);
    if (errs.length)
        bad++;
}
records['built:incomplete'] = POSITIVE[0][1];
const find = (rec, id) => rec.results.find((r) => r.id === id);
const MUTANTS = [
    ['lambda of an undefined well as a bare null', 'undefined-well.json', (r) => { const i = r.results.findIndex((x) => x.id === 'lambda:A2'); r.results[i] = null; }],
    ['µL written with the Greek letter mu', 'normal-result.json', (r) => { r.inputs[1].unit = 'μL'; }],
    ['a flag code with its internal prefix', 'undefined-well.json', (r) => { r.flags[0].code = 'T1-FL-01'; }],
    ['a declaration with no basis', 'normal-result.json', (r) => { delete r.declarations[0].basis; }],
    ['an extra member at the top', 'normal-result.json', (r) => { r.sessionId = 'abc'; }],
    ['an extra member in a result', 'normal-result.json', (r) => { r.results[0].time = '12:00'; }],
    ['a display of 0E+3', 'worked-example.json', (r) => { find(r, 'copies-per-ul-original:A1').display = '0E+3'; }],
    ['an estimate with 6 significant figures', 'worked-example.json', (r) => { find(r, 'copies-per-ul-original:A1').display = '69,314.7'; }],
    ['lambda with grouping', 'worked-example.json', (r) => { find(r, 'lambda:A1').display = '1,386294361'; }],
    ['a computed value with no unrounded number', 'worked-example.json', (r) => { find(r, 'copies-per-ul-original:A1').unrounded = null; }],
    ['a refused record that carries results', 'refused-case.json', (r) => { r.results.push(clone(records['worked-example.json'].results[0])); }],
    ['a result record with an empty result list', 'worked-example.json', (r) => { r.results = []; r.tool.wells[0].results = []; r.tool.preparations[0].results = []; }],
    ['a date with a time of day', 'normal-result.json', (r) => { r.date = '2026-10-18T10:15:00'; }],
    ['a reference that does not resolve', 'titer-mode.json', (r) => { r.flags[0].results = ['no-such-result']; }],
    ['an undefined well whose per-mL value is a number', 'undefined-well.json', (r) => { const x = find(r, 'copies-per-ml-original:A2'); x.status = 'computed'; x.unrounded = 1; x.display = '1.000000'; x.note = null; }],
    ['a ruling id in a flag', 'titer-mode.json', (r) => { r.flags[0].words[0] += ' (NAD-2026-10-15-196)'; }],
    ['an em dash in a note', 'undefined-well.json', (r) => { find(r, 'lambda:A2').note += ` ${String.fromCodePoint(0x2014)} dilute`; }],
    ['a wrong research-use line', 'normal-result.json', (r) => { r.statements.researchUse = 'For research use.'; }],
    ['a seventh preparation', 'two-preparation-mean.json', (r) => { for (let i = 0; i < 5; i++)
            r.tool.preparations.push({ ...clone(r.tool.preparations[0]), name: `X${i}` }); }],
    ['a volume in mL in C8', 'normal-result.json', (r) => { r.inputs[1].unit = 'mL'; }],
    ['an unknown declaration in C8', 'normal-result.json', (r) => { r.declarations.push({ ...clone(r.declarations[0]), id: 'operator-name' }); }],
    ['a titer per-mL unit that is not a label', 'titer-mode.json', (r) => { find(r, 'copies-per-ml-original:A1').unit = 'vg/mL'; }],
    ['two ids alike', 'normal-result.json', (r) => { r.inputs.push(clone(r.inputs[0])); }],
    ['the superseded rounding-rule basis', 'normal-result.json', (r) => { r.constants.find((x) => x.id === 'rounding-rule').basis = 'No intermediate value is rounded.'; }],
    ['a working line with a comma decimal beside point displays', 'overall-factor-comma.json', (r) => { const x = find(r, 'copies-per-ul-reaction:A1'); x.working = x.working.replace('0.00085', '0,00085'); }],
    ['a working line repeating a comma entry', 'overall-factor-comma.json', (r) => { const x = find(r, 'overall-factor:P1'); x.working = 'F = 12,5 (one overall factor, as entered)'; }],
    ['a well listing a flag that does not name it', 'overall-factor-comma.json', (r) => { r.tool.wells[0].flags = ['FL-08']; }],
    ['FL-08 zero form naming the highest well too', 'overall-factor-comma.json', (r) => { r.flags.find((f) => f.code === 'FL-08').names = ['A1', 'A2']; }],
    ['an unchosen unit written as empty text', 'built:incomplete', (r) => { r.inputs.find((i) => i.id === 'partition-volume').unit = ''; }],
    ['a blank declaration kept with empty text', 'built:incomplete', (r) => { r.declarations.push({ id: 'instrument', label: 'Instrument and software version', of: null, value: null, text: '', unit: null, basis: { kind: 'user', words: "user's own", constant: null } }); }],
    ['an incomplete record that names nothing missing', 'built:incomplete', (r) => { r.outcome.missing = []; }],
    ['an agreement row for an engine version not compared', 'normal-result.json', (r) => { r.madeWith.engineVersion = '0.0.0'; if (!r.constants.some((x) => x.id === 'agreement-between-implementations'))
            r.constants.push({ id: 'agreement-between-implementations', name: 'Agreement between implementations', value: 'Displayed values, statuses, refusals, flags and labels identical; unrounded values within a relative difference of 1e-15', unit: null, kind: 'convention', status: 'characterised', basis: 'Tested for this engine version: an independent reimplementation and independently written expected values agree with this engine within this bound.', appliesTo: 'Every result', source: null, labelledAs: null }); }],
    ['a compared engine version without its agreement row', 'normal-result.json', (r) => { r.madeWith.engineVersion = COMPARED_ENGINE_VERSIONS[0]; r.constants = r.constants.filter((x) => x.id !== 'agreement-between-implementations'); }],
];
let caught = 0;
for (const [name, file, mutate] of MUTANTS) {
    const rec = clone(records[file]);
    mutate(rec);
    const raw = JSON.stringify(rec);
    let errs;
    try {
        errs = [...validate(schema, rec), ...crossCheck(rec, raw)];
    }
    catch (e) {
        errs = [`threw: ${e.message}`];
    }
    const ok = errs.length > 0;
    if (ok)
        caught++;
    else
        bad++;
    console.log(`${ok ? 'CAUGHT' : 'MISSED'}  mutant: ${name}${ok ? `  (${errs[0]})` : ''}`);
}
console.log(`\n${files.length} records checked, ${MUTANTS.length} mutants, ${caught} caught. ${bad ? `${bad} problems.` : 'No problems.'}`);
process.exit(bad ? 1 : 0);
