import * as THREE from 'three';

export default class Renderer {
    scene : THREE.Scene | undefined;
    camera: THREE.PerspectiveCamera | undefined;
    renderer: THREE.WebGLRenderer |  undefined;
    cube: THREE.Mesh | undefined;
    elementId: string | undefined;
    
    constructor(elementId?: string) {
        this.elementId = elementId; //For use later when appending the renderer to a specific element
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.setZ(5);

        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        

        const geometry: THREE.BoxGeometry = new THREE.BoxGeometry();
        const material: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: false });

        let cube: THREE.Mesh = new THREE.Mesh(geometry, material);

        this.scene.add(cube);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(2, 3, 4);
        this.scene.add(pointLight);
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
        if(!this.camera || !this.renderer) {
            console.error("Camera or renderer not initialized");
            return;
        }

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onContentLoaded() {
        if(!this.renderer) {
            console.error("Renderer not initialized");
        } else if(this.elementId) {
            const container = document.getElementById(this.elementId);
            if(container) {
                container.appendChild(this.renderer.domElement);
            } else {
                console.warn(`Element with id ${this.elementId} not found. Appending renderer to body.`);
                document.body.appendChild(this.renderer.domElement);
            }
        } else {
            document.body.appendChild(this.renderer.domElement);
        }
    }

}