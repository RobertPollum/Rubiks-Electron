// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge } = require('electron')

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { generateCube3dArray } from './cube';

const scene = new THREE.Scene()
const adjustmentFactor = .4;

const sizes = {
    width: window.innerWidth * adjustmentFactor,
    height: window.innerHeight * adjustmentFactor
}

const light = new THREE.AmbientLight(0xffffff, 1.0)
scene.add(light)

// const geometry0 = new THREE.BoxGeometry(3, 3, 3, 3, 3, 3);
// const geometry1 = new THREE.BoxGeometry(3, 3, 3, 3, 3, 3);
// const geometry2 = new THREE.BoxGeometry(3, 3, 3, 3, 3, 3);
// const geometry3 = new THREE.BoxGeometry(3, 3, 3, 3, 3, 3);
// const geometry4 = new THREE.BoxGeometry(3, 3, 3, 3, 3, 3);
// const geometry5 = new THREE.BoxGeometry(3, 3, 3, 3, 3, 3);
// const geometry6 = new THREE.BoxGeometry(3, 3, 3, 3, 3, 3);
// const geometry7 = new THREE.BoxGeometry(3, 3, 3, 3, 3, 3);
// const geometry8 = new THREE.BoxGeometry(3, 3, 3, 3, 3, 3);
// // const geometry9 = new THREE.BoxGeometry(3, 3, 3, 3, 3, 3);

// // const material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: false });
// const textureArray = [
//   new THREE.MeshStandardMaterial({ color: 0xff66ff }),
//   new THREE.MeshStandardMaterial({ color: 0xffffff * Math.random(), wireframe: true }),
//   new THREE.MeshStandardMaterial({ color: 0x66ffff }),
//   new THREE.MeshStandardMaterial({ color: 0xffffff * Math.random(), wireframe: true }),
//   new THREE.MeshStandardMaterial({ color: 0x66ff66 }),
//   new THREE.MeshStandardMaterial({ color: 0xffffff * Math.random(), wireframe: true })
// ];
// // const material = new THREE.MeshStandardMaterial({ color: 0xffffff * Math.random() });
// const cube0 = new THREE.Mesh(geometry0, textureArray);
// cube0.position.x = -4;
// cube0.position.y = -4;
// const cube1 = new THREE.Mesh(geometry1, textureArray);
// cube1.position.x = 0;
// cube1.position.y = -4;
// const cube2 = new THREE.Mesh(geometry2, textureArray);
// cube2.position.x = 4;
// cube2.position.y = -4;
// const cube3 = new THREE.Mesh(geometry3, textureArray);
// cube3.position.x = -4;
// cube3.position.y = 0;
// const cube4 = new THREE.Mesh(geometry4, textureArray);
// cube4.position.x = 0;
// cube4.position.y = 0;
// const cube5 = new THREE.Mesh(geometry5, textureArray);
// cube5.position.x = 4;
// cube5.position.y = 0;
// const cube6 = new THREE.Mesh(geometry6, textureArray);
// cube6.position.x = -4;
// cube6.position.y = 4;
// const cube7 = new THREE.Mesh(geometry7, textureArray);
// cube7.position.x = 0;
// cube7.position.y = 4;
// const cube8 = new THREE.Mesh(geometry8, textureArray);
// cube8.position.x = 4;
// cube8.position.y = 4;
// // const cube9 = new THREE.Mesh(geometry9, textureArray);
// scene.add(cube0);
// scene.add(cube1);
// scene.add(cube2);
// scene.add(cube3);
// scene.add(cube4);
// // scene.add(cube5);
// // scene.add(cube6);
// // scene.add(cube7);
// // scene.add(cube8);
// // scene.add(cube9);
let ThreeDCubeArray = generateCube3dArray(3, scene);
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
camera.position.set(0, 3, 12);
camera.lookAt(new THREE.Vector3(0, 0, 0))
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(window.devicePixelRatio);

// Initialize OrbitControls for mouse/touch camera orbiting
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.6;
controls.minDistance = 5;
controls.maxDistance = 30;
controls.target.set(0, 0, 0);
controls.update();

// Rubik's Cube rotation state management
let isRotating = false;
let rotationQueue = [];
let currentRotation = null;
const rotationSpeed = 0.1;
const rotationAngle = Math.PI / 2; // 90 degrees


// Function to get cubes belonging to a specific face
function getCubesToRotate(face) {
    const cubes = [];
    
    switch(face) {
        case 'R': // Right face (x = 3)
            for(let y = 0; y < 3; y++) {
                for(let z = 0; z < 3; z++) {
                    cubes.push(ThreeDCubeArray[z][y][2]);
                }
            }
            break;
        case 'L': // Left face (x = -3)
            for(let y = 0; y < 3; y++) {
                for(let z = 0; z < 3; z++) {
                    cubes.push(ThreeDCubeArray[z][y][0]);
                }
            }
            break;
        case 'U': // Up face (y = 3)
            for(let x = 0; x < 3; x++) {
                for(let z = 0; z < 3; z++) {
                    cubes.push(ThreeDCubeArray[z][2][x]);
                }
            }
            break;
        case 'D': // Down face (y = -3)
            for(let x = 0; x < 3; x++) {
                for(let z = 0; z < 3; z++) {
                    cubes.push(ThreeDCubeArray[z][0][x]);
                }
            }
            break;
        case 'F': // Front face (z = 3)
            for(let x = 0; x < 3; x++) {
                for(let y = 0; y < 3; y++) {
                    cubes.push(ThreeDCubeArray[2][y][x]);
                }
            }
            break;
        case 'B': // Back face (z = -3)
            for(let x = 0; x < 3; x++) {
                for(let y = 0; y < 3; y++) {
                    cubes.push(ThreeDCubeArray[0][y][x]);
                }
            }
            break;
    }
    
    return cubes;
}

// Function to start a face rotation
function rotateFace(face, clockwise = true) {
    if (isRotating) {
        rotationQueue.push({ face, clockwise });
        return;
    }
    
    isRotating = true;
    const cubes = getCubesToRotate(face);
    const group = new THREE.Group();
    scene.add(group);
    
    // Temporarily add cubes to the rotation group
    cubes.forEach(cube => {
        // Store original parent and position
        cube.userData.originalParent = cube.parent;
        cube.userData.originalPosition = cube.position.clone();
        cube.userData.originalRotation = cube.rotation.clone();
        
        // Convert position to group's local space
        const worldPosition = new THREE.Vector3();
        cube.getWorldPosition(worldPosition);
        scene.remove(cube);
        group.add(cube);
        group.worldToLocal(worldPosition);
        cube.position.copy(worldPosition);
    });
    
    currentRotation = {
        group: group,
        cubes: cubes,
        face: face,
        targetAngle: clockwise ? rotationAngle : -rotationAngle,
        currentAngle: 0,
        axis: getRotationAxis(face)
    };
}

// Function to get rotation axis for each face
function getRotationAxis(face) {
    switch(face) {
        case 'R':
        case 'L':
            return new THREE.Vector3(1, 0, 0);
        case 'U':
        case 'D':
            return new THREE.Vector3(0, 1, 0);
        case 'F':
        case 'B':
            return new THREE.Vector3(0, 0, 1);
        default:
            return new THREE.Vector3(0, 1, 0);
    }
}

// Function to update cube positions in the array after rotation
function updateCubeArray(face, clockwise) {
    const allCubes = [];
    
    for (let z = 0; z < 3; z++) {
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                allCubes.push(ThreeDCubeArray[z][y][x]);
            }
        }
    }
    
    const newArray = [
        [[null, null, null], [null, null, null], [null, null, null]],
        [[null, null, null], [null, null, null], [null, null, null]],
        [[null, null, null], [null, null, null], [null, null, null]]
    ];
    
    allCubes.forEach(cube => {
        const pos = cube.position;
        const tolerance = 0.5;
        
        let xIndex, yIndex, zIndex;
        
        if (pos.x < -2) xIndex = 0;
        else if (pos.x > 2) xIndex = 2;
        else xIndex = 1;
        
        if (pos.y < -2) yIndex = 0;
        else if (pos.y > 2) yIndex = 2;
        else yIndex = 1;
        
        if (pos.z < -2) zIndex = 0;
        else if (pos.z > 2) zIndex = 2;
        else zIndex = 1;
        
        newArray[zIndex][yIndex][xIndex] = cube;
    });
    
    ThreeDCubeArray = newArray;
}

// Function to show visual feedback
function showRotationFeedback(face, clockwise) {
    const infoElement = document.getElementById('info');
    if (infoElement) {
        const direction = clockwise ? 'clockwise' : 'counter-clockwise';
        infoElement.textContent = `Rotating ${face} face ${direction}...`;
        infoElement.style.color = '#4CAF50';
        infoElement.style.fontWeight = 'bold';
        
        // Clear feedback after animation
        setTimeout(() => {
            infoElement.textContent = 'Ready for next move';
            infoElement.style.color = '#333';
        }, 1000);
    }
}

// Keyboard controls for cube rotations
document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    const clockwise = !event.shiftKey;
    
    switch(key) {
        case 'r':
            rotateFace('R', clockwise);
            showRotationFeedback('Right', clockwise);
            break;
        case 'l':
            rotateFace('L', clockwise);
            showRotationFeedback('Left', clockwise);
            break;
        case 'u':
            rotateFace('U', clockwise);
            showRotationFeedback('Up', clockwise);
            break;
        case 'd':
            rotateFace('D', clockwise);
            showRotationFeedback('Down', clockwise);
            break;
        case 'f':
            rotateFace('F', clockwise);
            showRotationFeedback('Front', clockwise);
            break;
        case 'b':
            rotateFace('B', clockwise);
            showRotationFeedback('Back', clockwise);
            break;
    }
});

renderer.setAnimationLoop(render)

function render() {
    // Handle cube face rotations
    if (currentRotation) {
        const { group, cubes, targetAngle, axis } = currentRotation;
        
        // Calculate rotation step
        const rotationStep = Math.sign(targetAngle) * rotationSpeed;
        currentRotation.currentAngle += rotationStep;
        
        // Apply rotation
        group.rotateOnAxis(axis, rotationStep);
        
        // Check if rotation is complete
        if (Math.abs(currentRotation.currentAngle) >= Math.abs(targetAngle)) {
            // Snap to exact angle
            const remainingAngle = targetAngle - currentRotation.currentAngle;
            group.rotateOnAxis(axis, remainingAngle);
            
            // Move cubes back to scene and update positions
            cubes.forEach(cube => {
                // Get world position and rotation
                const worldPosition = new THREE.Vector3();
                const worldQuaternion = new THREE.Quaternion();
                cube.getWorldPosition(worldPosition);
                cube.getWorldQuaternion(worldQuaternion);
                
                // Remove from group and add back to scene
                group.remove(cube);
                scene.add(cube);
                
                // Apply world transform
                cube.position.copy(worldPosition);
                cube.quaternion.copy(worldQuaternion);
            });
            
            // The group is now empty and the rotation is complete, so remove it from the scene.
            scene.remove(group);
            
            // Update cube array positions
            updateCubeArray(currentRotation.face, currentRotation.targetAngle > 0);
            
            // Reset rotation state
            currentRotation = null;
            isRotating = false;
            
            // Process next rotation in queue
            if (rotationQueue.length > 0) {
                const nextRotation = rotationQueue.shift();
                rotateFace(nextRotation.face, nextRotation.clockwise);
            }
        }
    }
    // Update camera controls (damped orbiting)
    controls.update();
    renderer.render(scene, camera)
}

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth * adjustmentFactor;
    sizes.height = window.innerHeight * adjustmentFactor;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(window.devicePixelRatio)

    // Keep controls in sync after resize
    controls.update();
})

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron
  // we can also expose variables, not just functions
});

window.addEventListener("DOMContentLoaded", () => {
   document.body.appendChild(renderer.domElement);
});