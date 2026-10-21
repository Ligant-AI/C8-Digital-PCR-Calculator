# The Bench Tools saved record, format 1.0.0

`ligant-benchtools-record-1.0.0.schema.json` describes the JSON record a Ligant Bench Tools calculator saves when you choose "Download JSON record". It uses JSON Schema draft 2020-12. Every tool in the suite writes the same outer part, so another tool can read a record without knowing the tool that made it. Each tool adds its own section, `tool`, and documents its shape. The Digital PCR Calculator is the first tool to write this format, and its section is described in the same file.

A record holds only what the page already holds. Nothing in it is sent anywhere. You save the file, and you decide where it goes.

## What every record carries

| Member | What it holds |
|---|---|
| `format` | The format's name, `ligant-benchtools-record`, its version, and where this description can be read. |
| `madeWith` | The tool's short identifier and name, its address, the tool version, the engine version, a link to the engine's public source code at that version, and the order of evaluation. Two records with the same engine version and order of evaluation come from the same arithmetic. |
| `date` | The date the record was saved, as year-month-day. No time of day and no time zone. |
| `statements` | What the tool covers, the research-use statement, how to cite the tool, and its DOI (null while a release has none). |
| `precision` | How many digits each value is shown with, what that does and does not mean, and the rounding rule. |
| `outcome` | Whether a result was computed. If not, why not: the declarations still to make, the refused entries with their messages, a case this release does not support, or entries that could not be read. |
| `declarations` | Every declaration, each with its basis: your own, a source you named, a published value you inserted, or a rule of the tool. |
| `constants` | Every relation, constant, published value, threshold, convention and limit used, with its basis, and what it applies to, and where it has one, its source and the source's exact words. |
| `assumptions` | The assumptions under which the results hold. |
| `inputs` | Every entry exactly as typed or pasted, with its unit, and the converted value where the tool converted one. |
| `results` | Every computed value with its unit, the relation used, the working with your numbers, its unrounded value and the text the page shows. |
| `flags` | Every flag raised, as its `FL-nn` code with its words. |
| `tool` | The tool's own section. |

## Ids and references

Each declaration, constant, entry and result has an `id`: a kind, then after a colon the well, preparation or step it belongs to, as you named it (`copies-per-ul-original:A1`, `step-in:P1 step 1`). Ids are unique within a record. Other parts refer to them:

- `restsOn` lists the declarations and constants an entry or a result rests on.
- A published value's declaration names its entry in `constants`, which holds the source and its quote.
- The `tool` section lists, for each preparation and well, the ids of its entries and results. It repeats no number, so the record cannot hold two versions of one value.

## Values, units and display

- **Entries** are the text you typed or pasted, under the declared decimal separator, including text the tool refused. A field left empty is the empty text.
- **Declarations** not yet made are left out of `declarations`. `outcome.missing` names them.
- **Units** are written in full, as the page writes them. The micro sign is `µ` (U+00B5), never the Greek letter mu (U+03BC). A value with no unit, such as a count or a ratio, has the unit `null`, as does a unit not yet chosen.
- **Results** carry `unrounded` and `display`, both from one computation:
  - `unrounded` is the value as computed before any rounding, written as the shortest decimal that reads back to the same double-precision number. Read it as a double.
  - `display` is the text the page shows.
- **Status.** A result is `computed`; `undefined` where it has no number (in the Digital PCR Calculator, a well where every accepted partition is positive); or `withheld`, with the reason in words (for example, a mean that includes an undefined well). An undefined or withheld value has `unrounded` null. It is never left out, and never a bare null.

## Reading a record into another tool

A tool that reads a record shall:

1. **show every declaration** it carries, with its basis, before it uses any value, and ask you to confirm;
2. **refuse** a value whose unit or basis does not match one of its own required declarations, and **say which one**;
3. **never convert** a unit or relabel a value silently.

`restsOn` tells a reading tool where to look for a value's basis. Four rules apply to every reading tool:
- The unit must match exactly as written, or the value is refused.
- The target is always shown. Where the reading tool asks for a target, or combines or compares values from more than one record, the target name and, in titer mode, the target class must match exactly. Two targets on one lot are two measurements.
- A vector genome (vg) or genome copy (GC) value is taken only from a titer-mode per-mL result, whose unit says which it is. A per-µL value, or a value from the base mode, is never used as one.
- Every other declaration a value rests on is shown with its basis, and is matched only where the reading tool's own description says so.

Release 1.0 of the Digital PCR Calculator writes records and reads none.

## The Digital PCR Calculator's section

`tool.shape` is `{ "name": "Digital PCR Calculator", "version": "1.0.0" }`.

| Member | What it holds |
|---|---|
| `label` | The result's label: what the per-mL result is, the target, and the line shown where no DNase step was declared. Null where no result was computed. |
| `headline`, `recordLabel` | In titer mode, the headline and the one-line label that travels with the number. Null in the base mode. |
| `preparations` | Each preparation in order (at most 6): its name, its dilution declaration, its entries, and its template ratio, step factors and overall factor. |
| `wells` | Each well in order: its label, its preparation, whether it was ticked for the mean, its status, its entries, its results in the order of the calculation, and the flags that name it: exactly the flags whose `names` include this well. |
| `mean` | The mean of the ticked wells: computed or withheld, the words "arithmetic mean of each ticked well's result", the sentence shown beside it, the wells and preparations it includes, the wells not included, and its results. Null where fewer than two wells are ticked. |

In a Digital PCR Calculator record, the declarations, entries and results each have a fixed set of kinds. Every display string follows the page's display rule:

- estimates are shown to 7 significant figures;
- lambda is shown to 10;
- exact ratios are shown in full when whole, and otherwise to 7 significant figures with trailing zeros dropped;
- the highest-to-lowest ratio is shown to 3 significant figures.

In titer mode, the per-mL values take as their unit the label your free-DNA answer gives them, for example "vector genomes per mL (vg/mL), DNase-treated". The target is not part of the unit. It is carried by the target class declaration and the tool section's label, and a reading tool treats it as part of the value's basis.

## Adding a tool, and versions

- A tool with no section in this file is still checked against the outer part. Its `tool` section must name its shape and version, and that tool publishes the section's description beside its own page.
- Adding a tool's section to this file is a minor version (1.1.0). So is adding an optional member. A change that would stop an existing reader from reading a record is a major version. A change to the wording of a description is a patch.
- A record always names the format version it was written in.
- A tool's section holds nothing that the Privacy list says a record does not contain. Its description is reviewed for privacy before it is added to this file.

## Privacy

A record contains:

- your entries as typed;
- your declarations, including any free text you typed: the instrument, the target name, methods, conditions, well and preparation labels, and sources you named;
- the results;
- the tool's fixed texts;
- the date.

It does not contain:

- a time of day or a time zone;
- any identifier for the record, the computer or the person;
- the raw pasted table, or any pasted column you did not map;
- anything from the export email step, or the consent choice;
- the browser, the language setting or the location.

Whatever you type into a free-text field is saved as you typed it.

## The example records

| File | What it shows |
|---|---|
| `examples/normal-result.json` | One well, a 432 pL partition volume inserted from the published values with its source and quote, not diluted. |
| `examples/titer-mode.json` | Titer mode: free DNA removed by DNase, capsids opened with proteinase K, ITR target. Three wells, two ticked for the mean, and FL-08 against a limit of 1.1. |
| `examples/undefined-well.json` | A well where every accepted partition is positive: its values have no number, FL-01 is raised, and the mean is withheld. |
| `examples/refused-case.json` | A total reaction volume below master mix plus sample: refused, with the message, and no results. |
| `examples/two-preparation-mean.json` | Two preparations of one sample with different dilution chains, one well each, and their mean. |
| `examples/worked-example.json` | The worked example as Learn mode loads it, with FL-07 because its 1 nL partition volume is unchanged. |
| `examples/overall-factor-comma.json` | One overall dilution factor, typed, and counts pasted from a table with a decimal comma, so every entry is read with a comma. Titer mode, with free DNA removed another way and a heat step with its conditions. One ticked well has no positive partitions, so FL-02 is raised and FL-08 takes its zero form, naming only that well. |

## How the examples were checked

- Each example is built from the calculator's own result, in the page's words, and validates against this schema.
- Each was also recomputed from its own entries without the calculator:
  - its unrounded values agree with a 40-digit decimal reference to within 1e-15 relative;
  - every display string is identical to the display rule's.
- A schema cannot check that ids are unique, or that every reference resolves to an entry, declaration, constant or result. A reader should check both.
