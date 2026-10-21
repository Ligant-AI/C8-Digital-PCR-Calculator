export const SIGNED_CONSTANTS = Object.freeze([
    {
        "id": "poisson-relation",
        "name": "Poisson relation",
        "value": "lambda = −ln(1 − p), p = k ÷ n",
        "unit": null,
        "kind": "relation",
        "status": "disclosed",
        "basis": "Quan et al. 2018, section 2.1; the mapping of k and n is Ligant's.",
        "appliesTo": "Every lambda",
        "source": {
            "citation": "Quan P-L, Sauzade M, Brouzes E. dPCR: A Technology Review. Sensors 2018;18(4):1271, section 2.1",
            "url": null,
            "dateRead": null,
            "quotes": [
                "the ratio of positive partitions k (containing some target sequences) over the total number of partitions n is sufficient to predict the initial concentration of the target sequence in the sample with λ=−ln(1− k/n)."
            ],
            "tableVersion": null,
            "note": null
        },
        "labelledAs": "Ligant's mapping: k = positive partitions; n = accepted partitions."
    },
    {
        "id": "copies-per-reaction-relation",
        "name": "Copies per µL of reaction",
        "value": "lambda ÷ Vd",
        "unit": null,
        "kind": "relation",
        "status": "derived",
        "basis": "Derivation: lambda is the mean number of copies per partition, and each partition holds Vd µL, so copies per µL of reaction = lambda ÷ Vd.",
        "appliesTo": "Every copies per µL of reaction, and every value computed from it",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "template-ratio-relation",
        "name": "Template ratio",
        "value": "R ÷ V, formed first",
        "unit": null,
        "kind": "relation",
        "status": "derived",
        "basis": "Derivation: the sample is mixed into the whole reaction, so the sample's concentration is the reaction's concentration times total ÷ sample.",
        "appliesTo": "Each preparation's template ratio, and every value computed from it",
        "source": null,
        "labelledAs": "Ligant's reading: Addgene's titer protocol divides by the volume of virus in the reaction mix. Reading its R and V as the loaded volume and the sample in it gives 20 ÷ 4 = 25 ÷ 5 = 5, the same ratio as total ÷ sample."
    },
    {
        "id": "dilution-factor-relation",
        "name": "Dilution factor",
        "value": "total ÷ volume in per step; product in bench order",
        "unit": null,
        "kind": "relation",
        "status": "disclosed",
        "basis": "Definition.",
        "appliesTo": "Each dilution step's factor and each preparation's overall factor",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "ul-per-ml",
        "name": "µL per mL",
        "value": "1000",
        "unit": null,
        "kind": "constant",
        "status": "disclosed",
        "basis": "Unit definition.",
        "appliesTo": "Every per-mL value",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "order-of-evaluation",
        "name": "Order of evaluation",
        "value": "Version 1, nine steps",
        "unit": null,
        "kind": "convention",
        "status": "disclosed",
        "basis": "So that two results can be shown to come from the same arithmetic.",
        "appliesTo": "Every result",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "unit-conversion",
        "name": "Unit conversion",
        "value": "Decimal-point shift on the entered text: nL 3, pL 6 places",
        "unit": null,
        "kind": "convention",
        "status": "disclosed",
        "basis": "Never by a floating-point multiply or divide.",
        "appliesTo": "The partition volume, where entered in nL or pL",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "partition-volume-rule",
        "name": "Partition volume",
        "value": "Yours, no default; or inserted from the published values",
        "unit": null,
        "kind": "convention",
        "status": "disclosed",
        "basis": "This tool cannot know the value for your instrument.",
        "appliesTo": "The partition volume, and every value from copies per µL of reaction onward",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "undefined-result",
        "name": "Undefined result",
        "value": "p = 1",
        "unit": null,
        "kind": "threshold",
        "status": "disclosed",
        "basis": "Definitional: −ln(0) is not finite.",
        "appliesTo": "Each well where every accepted partition is positive",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "zero-result",
        "name": "Zero result",
        "value": "k = 0 gives 0, displayed \"0\"",
        "unit": null,
        "kind": "threshold",
        "status": "disclosed",
        "basis": "Definitional.",
        "appliesTo": "Each well with no positive partitions",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "refuse-positive-above-accepted",
        "name": "Positive above accepted",
        "value": "Refused",
        "unit": null,
        "kind": "threshold",
        "status": "disclosed",
        "basis": "Definitional: positives are part of the accepted.",
        "appliesTo": "Each well's counts",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "refuse-sample-not-less-than-total",
        "name": "Sample not less than total",
        "value": "Refused",
        "unit": null,
        "kind": "threshold",
        "status": "disclosed",
        "basis": "The total includes the master mix as well as the sample.",
        "appliesTo": "Each preparation's total and sample volumes",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "refuse-total-below-mix-plus-sample",
        "name": "Total below master mix plus sample",
        "value": "Refused; equality accepted",
        "unit": null,
        "kind": "threshold",
        "status": "disclosed",
        "basis": "The total must include the sample.",
        "appliesTo": "Each preparation where the master mix is entered",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "refuse-zero-or-fractional",
        "name": "Accepted 0, fractional counts, zero volumes",
        "value": "Refused",
        "unit": null,
        "kind": "threshold",
        "status": "disclosed",
        "basis": "With no accepted partitions there is nothing to count from.",
        "appliesTo": "Every count and every volume",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "refuse-concentrating-step",
        "name": "Dilution step total below its volume in; one overall factor below 1",
        "value": "Refused",
        "unit": null,
        "kind": "threshold",
        "status": "disclosed",
        "basis": "The total includes the volume in; a dilution factor is 1 or more.",
        "appliesTo": "Each dilution step, and a typed overall factor",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "flag-factor-one-step",
        "name": "Factor-1 step",
        "value": "Flagged",
        "unit": null,
        "kind": "threshold",
        "status": "disclosed",
        "basis": "This step does not dilute (factor 1).",
        "appliesTo": "Each dilution step",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "your-own-limits",
        "name": "Expected accepted partitions, ratio limit, working range",
        "value": "Yours, optional, no default",
        "unit": null,
        "kind": "convention",
        "status": "disclosed",
        "basis": "Flags compare only against a value you declare.",
        "appliesTo": "The expected accepted partitions, the highest-to-lowest limit and the working range, where you declare them",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "mean-relation",
        "name": "Mean of ticked wells",
        "value": "Arithmetic mean of each ticked well's result, in listed order",
        "unit": null,
        "kind": "relation",
        "status": "disclosed",
        "basis": "It is not a result from the wells' counts added together.",
        "appliesTo": "The mean of the ticked wells, per µL and per mL",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "analysis-limits",
        "name": "Limits",
        "value": "6 preparations per analysis; 8 wells and 6 steps per preparation",
        "unit": null,
        "kind": "limit",
        "status": "disclosed",
        "basis": "Product limits, not science.",
        "appliesTo": "The whole analysis",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "displayed-precision",
        "name": "Displayed precision",
        "value": "7 significant figures; lambda 10",
        "unit": null,
        "kind": "convention",
        "status": "disclosed",
        "basis": "Shown so that you can follow the arithmetic by hand.",
        "appliesTo": "Every display string",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "rounding-rule",
        "name": "Rounding",
        "value": "Half away from zero on the exact binary value, once, for display",
        "unit": null,
        "kind": "convention",
        "status": "disclosed",
        "basis": "No intermediate value is rounded to display precision; each is carried as a double.",
        "appliesTo": "Every display string",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "lambda-evaluation",
        "name": "Lambda evaluation form",
        "value": "−log1p(−p), the same quantity as −ln(1 − p), which the page writes",
        "unit": null,
        "kind": "convention",
        "status": "disclosed",
        "basis": "−log1p(−p) gives the same quantity as −ln(1 − p) and keeps its last digits when p is small. With 1 positive partition in 10,000,000, −ln(1 − p) is wrong in the 10th significant figure, a figure the page shows.",
        "appliesTo": "Every lambda",
        "source": null,
        "labelledAs": null
    },
    {
        "id": "agreement-between-implementations",
        "name": "Agreement between implementations",
        "value": "Displayed values, statuses, refusals, flags and labels identical; unrounded values within a relative difference of 1e-15",
        "unit": null,
        "kind": "convention",
        "status": "characterised",
        "basis": "Tested for this engine version: an independent reimplementation and independently written expected values agree with this engine within this bound.",
        "appliesTo": "Every result",
        "source": null,
        "labelledAs": null
    }
]);
export const PUBLISHED_ROW = Object.freeze({
    "namePrefix": "Partition volume, from the published values: ",
    "kind": "published-value",
    "status": "disclosed",
    "basis": "A value other people have published, inserted by you. The tool uses only the value you enter.",
    "appliesTo": "The partition volume, and every value from copies per µL of reaction onward"
});
export const SCOPE_WORDS = Object.freeze({ base: "For data from droplet and chamber-based digital PCR instruments, using the partition volume you declare. The positive and accepted partitions are the counts your instrument's software gives: this tool does not call partitions positive or negative, or set a threshold. Original sample: the material before the first dilution you entered, for example your vector lot or your DNA extract.", titer: "Titer mode is for DNA-genome vector lots, such as AAV. It does not cover RNA-genome vectors measured by RT-ddPCR, such as lentiviral lots." });
export function scopeWords(titer) {
    return titer ? `${SCOPE_WORDS.base} ${SCOPE_WORDS.titer}` : SCOPE_WORDS.base;
}
export const RESULT_TEXT = Object.freeze({
    "template-ratio": {
        "label": "Template ratio, total ÷ sample",
        "relation": "r = R ÷ V, the total reaction volume after the sample is added ÷ the volume of sample, formed first"
    },
    "step-factor": {
        "label": "Dilution step {i}, total ÷ volume in",
        "relation": "f = total volume of the step ÷ volume in"
    },
    "overall-factor": {
        "label": "Overall dilution factor",
        "relation": "F = the product of the step factors, multiplied in bench order, first dilution first"
    },
    "p": {
        "label": "Fraction of accepted partitions that are positive",
        "relation": "p = k ÷ n, positive partitions ÷ accepted partitions"
    },
    "lambda": {
        "label": "lambda, copies per partition",
        "relation": "lambda = −ln(1 − p)"
    },
    "copies-per-ul-reaction": {
        "label": "Copies per µL of reaction",
        "relation": "c_rxn = lambda ÷ Vd, with Vd the partition volume in µL"
    },
    "copies-per-ul-diluted": {
        "label": "Copies per µL of the diluted sample",
        "relation": "c_rxn × r"
    },
    "copies-per-ul-original": {
        "label": "Copies per µL of the original sample",
        "relation": "(c_rxn × r) × F"
    },
    "copies-per-ml-original": {
        "label": "Copies per mL of the original sample",
        "relation": "copies per µL of the original sample × 1000"
    },
    "mean-copies-per-ul-original": {
        "label": "Mean copies per µL of the original sample",
        "relation": "arithmetic mean of each ticked well's result, summed in listed order and divided by the number of ticked wells"
    },
    "mean-copies-per-ml-original": {
        "label": "Mean copies per mL of the original sample",
        "relation": "mean copies per µL of the original sample × 1000"
    },
    "highest-to-lowest": {
        "label": "Highest ÷ lowest ticked well",
        "relation": "highest ticked well's copies per µL of the original sample ÷ the lowest, on unrounded values"
    }
});
export const OVERALL_RELATION = Object.freeze({
    steps: RESULT_TEXT['overall-factor'].relation,
    none: 'F = 1, not diluted',
    factor: 'F = the one overall factor, as entered',
});
export const UNDEFINED_NOTE = "Every accepted partition is positive, so the number of copies cannot be estimated.";
export const DECLARATION_LABELS = Object.freeze({
    "mode": "Titer mode",
    "data-entry": "How will you enter the counts?",
    "decimal-separator": "Decimal separator",
    "partition-volume-source": "Partition volume source",
    "dilution": "Dilution before PCR",
    "free-dna-method": "Free DNA removed before PCR: method"
});
export const INPUT_LABELS = Object.freeze({
    "partition-volume": "Partition volume",
    "total": "Total volume of the reaction after the sample (template) is added",
    "sample": "Volume of sample (template) added to that reaction",
    "mix": "Master mix per reaction, before the sample is added (µL)",
    "step-in": "Volume in (µL)",
    "step-total": "Total volume of this step (µL)",
    "positive": "Positive partitions",
    "accepted": "Accepted partitions"
});
export const DECIMAL_TOOL_RULE = "Typed numbers use a full stop as the decimal separator.";
export const OUTCOME_WORDS = Object.freeze({ result: "A result was computed.", incomplete: 'No result yet', refused: "No result: an entry is refused", unsupported: 'No result: this case is not supported', error: 'No result: the entries could not be read together' });
export const ORDER_WORDS = "order of evaluation 1";
