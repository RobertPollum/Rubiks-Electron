import Renderer from './threerenderer';

// Extend the Window interface to include 'versions'
declare global {
    interface Window {
        versions: {
            node: () => string;
            chrome: () => string;
            electron: () => string;
        };
    }
}

let renderer = new Renderer("container"); //create instance so the three js cube render starts rendering in the element with id "container"
renderer.animate();
window.addEventListener('resize', renderer.onWindowResize, false);

const info = document.getElementById('info');
if (info && info.innerText) {
    info.innerText = `This is the renderer process.
    It can use Node.js APIs, but cannot access Electron APIs directly.
    
    Node.js version: ${window.versions.node()}
    Chromium version: ${window.versions.chrome()}
    Electron version: ${window.versions.electron()}`;
}

window.addEventListener('DOMContentLoaded', () => {
    renderer.onContentLoaded();
});