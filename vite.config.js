import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { renderHeader } from './src/ui/chrome.js';
import { sectionsHtml } from './src/ui/sections.js';
import { faqHtml, jsonLdHtml } from './src/ui/seo.js';
const STATIC = [
    ['<header class="masthead" id="site-header"></header>', () => `<header class="masthead" id="site-header">${renderHeader()}</header>`],
    ['<div class="panel-body prose" id="about-body"></div>', () => `<div class="panel-body prose" id="about-body">${sectionsHtml()}</div>`],
    ['<div class="panel-body prose" id="faq-body"></div>', () => `<div class="panel-body prose" id="faq-body">${faqHtml()}</div>`],
    ['</head>', () => `  ${jsonLdHtml()}\n</head>`],
];
const SCHEMA = 'schema/ligant-benchtools-record-1.0.0.schema.json';
const schemaFile = () => ({
    name: 'c8-record-schema',
    generateBundle() { this.emitFile({ type: 'asset', fileName: SCHEMA, source: readFileSync(new URL(SCHEMA, import.meta.url), 'utf8') }); },
});
const staticPage = () => ({
    name: 'c8-static-page',
    transformIndexHtml(html, ctx) {
        if (!/(^|\/)index\.html$/.test(ctx.filename || ctx.path || ''))
            return html;
        let out = html;
        for (const [marker, content] of STATIC) {
            if (!out.includes(marker))
                throw new Error(`c8-static-page: marker not found in index.html: ${marker}`);
            out = out.replace(marker, content);
        }
        return out;
    },
});
export default defineConfig(({ mode }) => ({
    base: './',
    plugins: [staticPage(), schemaFile()],
    build: {
        modulePreload: { polyfill: false },
        target: 'es2022',
            },
    server: { port: 5178, strictPort: true },
}));
