// Renderer entry point. Everything the user sees runs from here.
//
// This file must stay free of Electron/Node APIs: the same code is meant to
// run as a plain web page. Anything platform-specific belongs behind
// ./platform (see platform/index.js).

import './index.css';
import { createPlatform } from './platform';
import { bootstrap } from './app/bootstrap';

function start() {
    bootstrap(createPlatform()).catch(err => {
        console.error('Failed to start the app:', err);
    });
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', start);
} else {
    start();
}
