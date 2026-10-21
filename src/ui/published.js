export const PANEL_VERSION = '1';
export const PANEL_GROUPS = Object.freeze([
    {
        id: 'bio-rad',
        group: 'Bio-Rad droplet systems',
        source: 'Corbisier et al. 2015',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4336415/',
        read: null,
        entries: [
            { id: 'bio-rad-0.91', value: '0.91', unit: 'nL', item: 'QuantaSoft 1.3.2.0', quotes: ['The volume of 0.91 nL used in the QuantaSoft software version 1.3.2.0 was found to be inaccurate'] },
            { id: 'bio-rad-0.85', value: '0.85', unit: 'nL', item: 'QuantaSoft 1.6.6.0320', quotes: ['uses a droplet volume of 0.85 nL as a defined parameter to calculate copy number concentration', 'is not accompanied with an uncertainty'] },
            { id: 'bio-rad-0.834', value: '0.834', unit: 'nL', item: 'measured', quotes: ['was measured as 0.834 nL which is much smaller than the value of 0.91 nL used in the QuantaSoft software version 1.3.2.0'] },
        ],
    },
    {
        id: 'qiacuity',
        group: 'QIAGEN QIAcuity',
        source: 'QIAGEN webinar recap (2020 webinar)',
        url: 'https://www.qiagen.com/us/knowledge-and-support/knowledge-hub/science-matters/pcr-solutions/webinar-recap-introduction-to-digital-pcr-on-the-qiacuity',
        read: '15 October 2026',
        sharedQuote: 'For 8.5K partitions with a fixed partition volume of 0.34 nl, the analyzed volume is approximately 3 µl. For 26K partitions with a fixed partition volume of 0.91 nl, the analyzed volume is approximately 24 µl.',
        entries: [
            { id: 'qiacuity-8.5k-0.34', value: '0.34', unit: 'nL', item: '8.5K partitions', quotes: [] },
            { id: 'qiacuity-26k-0.91', value: '0.91', unit: 'nL', item: '26K partitions', quotes: [] },
        ],
    },
    {
        id: 'absolute-q',
        group: 'Thermo Fisher QuantStudio Absolute Q, MAP16 plate',
        source: 'product FAQ',
        url: 'https://www.thermofisher.com/order/catalog/product/A52864/faqs',
        read: '15 October 2026',
        entries: [
            { id: 'absolute-q-map16-432pL', value: '432', unit: 'pL', item: 'MAP16 plate', quotes: ['Each microchamber holds 432 picoliters (pL).', 'Each microarray consists of approximately 20,000 microchambers, each accommodating 432 pL (picoliter) volume of reaction.'] },
        ],
    },
    { id: 'stilla', group: 'Stilla', entries: [], none: true },
]);
export function panelEntry(id) {
    for (const g of PANEL_GROUPS)
        for (const e of g.entries)
            if (e.id === id)
                return { group: g, entry: e };
    return null;
}
export function entryName(found) {
    return found.group.group.includes(found.entry.item) ? found.group.group : `${found.group.group}, ${found.entry.item}`;
}
