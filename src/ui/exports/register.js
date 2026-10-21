import { ENGINE_VERSION } from '../../engine/version.js';
import { SECTION_TEXT } from '../sections.js';
import { SIGNED_CONSTANTS } from './signed.js';
export const COMPARED_ENGINE_VERSIONS = Object.freeze(['1.0.0']);
export function includedConstants(engineVersion = ENGINE_VERSION) {
    return SIGNED_CONSTANTS.filter((c) => c.id !== 'agreement-between-implementations' || COMPARED_ENGINE_VERSIONS.includes(engineVersion));
}
export function registerRows() {
    return includedConstants().map((c) => ({ item: c.name, value: c.value, kind: c.kind, status: c.status, basis: c.basis, appliesTo: c.appliesTo, labelledAs: c.labelledAs }));
}
export function assumptionRows() {
    return SECTION_TEXT.assumptions.map(([assumption, appliesTo]) => ({ assumption, appliesTo, status: 'disclosed' }));
}
