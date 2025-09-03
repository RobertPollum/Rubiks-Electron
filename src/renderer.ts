/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/latest/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */
import * as THREE from 'three';
import './index.css';

console.log('👋 This message is being logged by "renderer.js", included via webpack');

class Renderer {
    scene : THREE.Scene | undefined;
    camera: THREE.PerspectiveCamera | undefined;
    renderer: THREE.WebGLRenderer |  undefined;
    cube: THREE.Mesh | undefined;
    
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.setZ(5);

        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this.renderer.domElement);

        const geometry: THREE.BoxGeometry = new THREE.BoxGeometry();
        const material: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });

        let cube: THREE.Mesh = new THREE.Mesh(geometry, material);

        this.scene.add(cube);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(2, 3, 4);
        this.scene.add(pointLight);

        this.animate();
        window.addEventListener('resize', this.onWindowResize, false);
    }

    animate() {
        requestAnimationFrame(this.animate);
        if(!this.cube || !this.scene || !this.camera || !this.renderer) return;
        // Rotate the cube for demonstration
        this.cube.rotation.x += 0.005;
        this.cube.rotation.y += 0.005;

        this.renderer.render(this.scene, this.camera);
    }

    // Handle window resize
    onWindowResize() {
        if(!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

}