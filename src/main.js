import '@ligant/bench-chrome/chrome.css';
import { bindCopy } from '@ligant/bench-chrome';
import { renderHeader, renderFooter } from './ui/chrome.js';
import { start } from './ui/app.js';
document.getElementById('site-header').innerHTML = renderHeader();
const footer = document.getElementById('site-footer');
footer.innerHTML = renderFooter();
bindCopy(footer);
start();
