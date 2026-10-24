const SENTINEL = '\u0000c8-negative-zero\u0000';
export function harnessJson(value) {
    const plain = JSON.stringify(value, null, 2);
    const quoted = JSON.stringify(SENTINEL);
    if (plain !== undefined && plain.includes(quoted))
        throw new Error('harnessJson: the output already holds the −0 marker text');
    let seen = false;
    const text = JSON.stringify(value, (key, v) => {
        if (typeof v === 'number' && Object.is(v, -0)) {
            seen = true;
            return SENTINEL;
        }
        return v;
    }, 2);
    return `${seen ? text.split(quoted).join('-0.0') : text}\n`;
}
