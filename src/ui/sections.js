import { escapeHtml as esc } from '@ligant/bench-chrome';
import { RULED, UI } from './text.js';
import { CONFIG } from '../config.js';
import { walkThrough } from './learn.js';
export const SECTION_TEXT = Object.freeze({
    whatItDoes: [
        'It calculates the concentration of one target sequence in the original sample, in copies per µL of the original sample and copies per mL of the original sample, from the positive and accepted partition counts of a digital PCR run, under a declared partition volume, a declared reaction composition and a declared pre-PCR dilution, with every intermediate value shown.',
        'In titer mode the per-mL result is labelled as a vector genome or genome copy titer according to your declarations.',
    ],
    howToUse: [
        ['The run.', 'Enter the instrument and software version, the partition volume with its unit, and the target name. The Published values list shows what others have published; it never fills the field for you.'],
        ['Sample preparations.', 'For each preparation, say whether the sample was diluted before PCR and enter each dilution step as the volume in and the total volume of the step. Then enter the total volume of the reaction after the sample is added, and the volume of sample in it.'],
        ['Partition counts per well.', 'Type each well\'s positive and accepted partitions, or paste a table and say which column is which. Choose each well\'s preparation, and tick the wells to include in the mean.'],
        ['Titer mode.', 'For a vector lot, switch titer mode on and answer its three questions.'],
        ['Read the result.', 'It updates as you type. Anything missing or refused is named beside its field, with what to do.'],
    ],
    howItWorksLead: 'Each well goes through the same nine steps, in this order, for every preparation.',
    steps: [
        { words: 'Unit conversion first, on the entered text: a partition volume entered in nL or pL is converted to µL by moving the decimal point (nL to µL: three places left; pL to µL: six places left), never by a floating-point multiply or divide.', formula: '0.85 nL = 0.00085 µL', basis: 'unit conversion' },
        { words: 'p, the fraction of accepted partitions that are positive: k is the positive partitions and n the accepted partitions of the well.', formula: 'p = k ÷ n', basis: 'definition' },
        { words: 'lambda.', formula: 'lambda = −ln(1 − p)', basis: 'published: Quan et al. 2018, section 2.1' },
        { words: 'Copies per µL of reaction, with Vd the partition volume in µL.', formula: 'c_rxn = lambda ÷ Vd', basis: 'derivation' },
        { words: 'Template ratio, formed first, where R is the preparation\'s total reaction volume after the sample is added and V its sample volume.', formula: 'r = R ÷ V', basis: 'derivation' },
        { words: 'Copies per µL of the diluted sample.', formula: 'c_rxn × r', basis: 'derivation' },
        { words: 'Dilution. Each step\'s factor is the total volume of the step over the volume in, each formed first. The overall factor is the product of the step factors, multiplied in bench order (first dilution first). With one overall factor, F is that number; not diluted, F = 1.', formula: 'f_i = total_i ÷ in_i; F = ((f_1 × f_2) × f_3) …', basis: 'definition' },
        { words: 'Copies per µL of the original sample.', formula: '(c_rxn × r) × F', basis: 'derivation' },
        { words: 'Copies per mL of the original sample.', formula: '(copies per µL of the original sample) × 1000', basis: 'unit conversion' },
    ],
    mapping: 'Ligant\'s mapping: k = positive partitions; n = accepted partitions, read as Quan\'s "total number of partitions" analysed.',
    derivation: 'm copies in n partitions of volume Vd are m ÷ (n × Vd) = lambda ÷ Vd copies per µL.',
    constantsHeading: 'Constants and assumptions',
    constants: [
        ['Poisson relation', 'lambda = −ln(1 − p), p = k ÷ n', 'Quan et al. 2018, section 2.1; the mapping of k and n is Ligant\'s.'],
        ['Copies per µL of reaction', 'lambda ÷ Vd', 'Derivation from Quan et al. 2018, λ = m/n.'],
        ['Template ratio', 'R ÷ V, formed first', 'Derivation; Addgene\'s equation is quoted above.'],
        ['Dilution factor', 'total ÷ volume in per step; product in bench order', 'Definition.'],
        ['µL per mL', '1000', 'Unit definition.'],
        ['Order of evaluation', 'Version 1, nine steps', 'So that two results can be shown to come from the same arithmetic.'],
        ['Unit conversion', 'Decimal-point shift on the entered text: nL 3, pL 6 places', 'Never by a floating-point multiply or divide.'],
        ['Partition volume', 'Yours, no default; or inserted from the published values', 'This tool cannot know the value for your instrument.'],
        ['Undefined result', 'p = 1', 'Definitional: −ln(0) is not finite.'],
        ['Zero result', 'k = 0 gives 0, displayed "0"', 'Definitional.'],
        ['Positive above accepted', 'Refused', 'Definitional: positives are part of the accepted.'],
        ['Sample not less than total', 'Refused', 'The total includes the master mix as well as the sample.'],
        ['Total below master mix plus sample', 'Refused; equality accepted', 'The total must include the sample.'],
        ['Accepted 0, fractional counts, zero volumes', 'Refused', 'With no accepted partitions there is nothing to count from.'],
        ['Dilution step total below its volume in; one overall factor below 1', 'Refused', 'The total includes the volume in; a dilution factor is 1 or more.'],
        ['Factor-1 step', 'Flagged', 'This step does not dilute (factor 1).'],
        ['Expected accepted partitions, ratio limit, working range', 'Yours, optional, no default', 'Flags compare only against a value you declare.'],
        ['Mean of ticked wells', 'Arithmetic mean of each ticked well\'s result, in listed order', 'It is not a result from the wells\' counts added together.'],
        ['Limits', '6 preparations per analysis; 8 wells and 6 steps per preparation', 'Product limits, not science.'],
        ['Displayed precision', '7 significant figures; lambda 10', 'Shown so that you can follow the arithmetic by hand.'],
        ['Rounding', 'Half away from zero on the exact binary value, once, for display', 'Intermediate values are not rounded to the digits shown; each is carried at full double precision.'],
    ],
    assumptionsHeading: 'Assumptions',
    assumptions: [
        ['Partitions are of equal volume, the declared Vd, and targets are distributed among them at random.', 'Every lambda'],
        ['The positive and accepted counts are from the same well and target, after your threshold.', 'Every result'],
        ['The declared volumes are those pipetted.', 'Every result'],
        ['The sample is uniformly mixed into the reaction, so the loaded or partitioned part has the reaction\'s concentration.', 'Steps 5 to 8'],
        ['Every preparation in one analysis comes from the same original sample.', 'Every mean across preparations'],
    ],
    quanAssumption: 'Quan et al. 2018: "Quantification by dPCR assumes that partitions possess identical volumes".',
    spreadsheetLead: 'A spreadsheet leaves these to memory or habit. Here each is a recorded declaration, beside its field and in every result:',
    spreadsheet: [
        'which volume is "the reaction volume";',
        'which partition volume applied, on which software version;',
        'whether positive and accepted counts come from the same well;',
        'DNase and lysis for a vector titer;',
        'the direction of a dilution factor (1 µL into 10 µL total is factor 10).',
    ],
    spreadsheetMore: 'Units are carried and converted on the number you typed, and the same entries always give the same results.',
    doesNot: 'It does not call partitions positive or negative, set a threshold, judge instrument quality, give a confidence interval, carry a default partition volume, or judge whether the partition volume you declare is right for your instrument.',
    notCovered: 'It does not cover reading the positive and accepted partitions and checking the threshold and partition quality in your instrument software, nor any extraction or concentration step before the first dilution you entered.',
    cannotDetect: 'What the tool cannot detect:',
    flagsLead: 'Flags never block a result. Each is shown with its code:',
    readCode: 'The calculation is open source.',
});
const T = SECTION_TEXT;
const p = (t) => `<p>${esc(t)}</p>`;
const dot = (t) => (/[.!?"”]$/.test(t) ? t : `${t}.`);
export function legendHtml() {
    return `<h4>${esc(UI.legendHeading)}</h4><p>${esc(T.flagsLead)}</p><table class="legend"><tbody>`
        + Object.entries(UI.flagLegend).map(([code, cond]) => `<tr id="legend-${code}"><td class="num">${code}</td><td>${esc(cond)}</td></tr>`).join('')
        + '</tbody></table>';
}
export function sectionsHtml() {
    const [s1, s2, s3, s4, s5] = UI.sections;
    const steps = T.steps.map((s, i) => `<tr><td class="num">${i + 1}</td><td>${esc(s.words)}</td><td class="num">${esc(s.formula)}</td><td>${esc(s.basis)}</td></tr>`).join('');
    return `<h3>${esc(s1)}</h3>${T.whatItDoes.map(p).join('')}${p(RULED.softwareConcentration)}`
        + `<h3>${esc(s2)}</h3><ol>${T.howToUse.map(([b, t]) => `<li><strong>${esc(b)}</strong> ${esc(t)}</li>`).join('')}</ol>`
        + `<h3>${esc(s3)}</h3>${p(T.howItWorksLead)}`
        + `<table class="steps-table"><thead><tr><th>Step</th><th>In words</th><th>Formula</th><th>Basis</th></tr></thead><tbody>${steps}</tbody></table>`
        + `<p>${esc(RULED.quanCitation)}: <q>${esc(RULED.quanQuote)}</q></p>${p(T.mapping)}`
        + `<p>${esc(RULED.derivationQuanMn)} ${esc(T.derivation)}</p>`
        + `<blockquote class="addgene">${esc(RULED.addgene)}</blockquote>`
        + `<h4>${esc(UI.workedExampleHeading)}</h4>${walkThrough()}`
        + `<p>${esc(RULED.precision)}</p>`
        + `<h4>${esc(T.constantsHeading)}</h4><table><thead><tr><th>Name</th><th>Value</th><th>Why</th></tr></thead><tbody>${T.constants.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join('')}</tbody></table>`
        + `<h4>${esc(T.assumptionsHeading)}</h4><table><thead><tr><th>Assumption</th><th>Applies to</th></tr></thead><tbody>${T.assumptions.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</tbody></table>${p(T.quanAssumption)}`
        + legendHtml()
        + `<p>${esc(T.readCode)} <a href="${esc(CONFIG.publicRepoUrl)}" rel="noopener">${esc(UI.readTheCode)}</a></p>`
        + `<p class="cite">${esc(RULED.zinCitation)}</p>`
        + `<p class="cite">${esc(RULED.zinLicence)}</p>`
        + `<p class="cite">${esc(RULED.addgeneRef)}</p>`
        + `<p class="cite">${esc(RULED.hindsonRef)}</p>`
        + `<p class="cite">${esc(RULED.corbisierRef)}</p>`
        + `<h3>${esc(s4)}</h3>${p(T.spreadsheetLead)}<ul>${T.spreadsheet.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>${p(RULED.rounding)}${p(T.spreadsheetMore)}`
        + `<h3>${esc(s5)}</h3>${p(T.doesNot)}${p(T.notCovered)}${p(T.cannotDetect)}<ol>${RULED.failureClasses.map((t) => `<li>${esc(dot(t))}</li>`).join('')}</ol>`
        + p(RULED.titerIntro) + p(RULED.twoTargets)
        + `<p class="trademarks">${esc(RULED.trademarks)}</p>`;
}
