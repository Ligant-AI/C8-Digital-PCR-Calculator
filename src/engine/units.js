export const MICRO = 'µL';
export const PARTITION_UNITS = Object.freeze({ nL: 3, pL: 6, [MICRO]: 0 });
export function shiftLeft(norm, places) {
    if (places === 0)
        return norm;
    const [i, f = ''] = norm.split('.');
    const digits = i + f;
    const point = i.length - places;
    if (point <= 0)
        return `0.${'0'.repeat(-point)}${digits}`;
    const head = digits.slice(0, point);
    const tail = digits.slice(point);
    return tail ? `${head}.${tail}` : head;
}
export function partitionVolumeInMicroLitre(norm, unit) {
    if (!Object.hasOwn(PARTITION_UNITS, unit))
        return null;
    const text = shiftLeft(norm, PARTITION_UNITS[unit]);
    return { text, value: Number(text) };
}
export function echoVolume(enteredText, unit, shiftedNorm, mark = '.') {
    if (unit === MICRO)
        return `${enteredText} ${MICRO}`;
    const right = shiftedNorm.includes('.') ? shiftedNorm.replace(/0+$/, '').replace(/\.$/, '') : shiftedNorm;
    return `${enteredText} ${unit} = ${right.replace('.', mark)} ${MICRO}`;
}
