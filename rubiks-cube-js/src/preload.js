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

// Cube State Tracking System
class CubeStateTracker {
    constructor() {
        this.cubes = new Map(); // Maps cube ID to state
        this.cubeIdCounter = 0;
    }

    // Initialize a cube with its starting orientation
    initializeCube(cubeObject, position) {
        const cubeId = this.cubeIdCounter++;
        
        // Store cube ID in the object
        cubeObject.userData.cubeId = cubeId;
        cubeObject.userData.position = position;
        
        // Initial cube face orientations
        // Each cube face is labeled with its initial direction
        const initialState = {
            id: cubeId,
            position: position,
            faces: {
                top: 'U',    // Up face initially points up
                bottom: 'D', // Down face initially points down
                front: 'F',  // Front face initially points front
                back: 'B',   // Back face initially points back
                right: 'R',  // Right face initially points right
                left: 'L'    // Left face initially points left
            }
        };
        
        this.cubes.set(cubeId, initialState);
        return cubeId;
    }

    // Get cube state by ID
    getCubeState(cubeId) {
        return this.cubes.get(cubeId);
    }

    // Update cube orientation after a rotation
    rotateCube(cubeId, rotationType) {
        const state = this.cubes.get(cubeId);
        if (!state) return;

        const faces = { ...state.faces }; // Copy current faces

        switch(rotationType) {
            case 'R': // Right face rotation (clockwise when looking at right face)
                // Rotate faces around X-axis (right-left axis)
                const tempR = faces.top;
                faces.top = faces.front;
                faces.front = faces.bottom;
                faces.bottom = faces.back;
                faces.back = tempR;
                break;

            case 'L': // Left face rotation (clockwise when looking at left face)
                // Rotate faces around X-axis (opposite direction)
                const tempL = faces.top;
                faces.top = faces.back;
                faces.back = faces.bottom;
                faces.bottom = faces.front;
                faces.front = tempL;
                break;

            case 'U': // Up face rotation (clockwise when looking at up face)
                // Rotate faces around Y-axis (up-down axis)
                const tempU = faces.front;
                faces.front = faces.right;
                faces.right = faces.back;
                faces.back = faces.left;
                faces.left = tempU;
                break;

            case 'D': // Down face rotation (clockwise when looking at down face)
                // Rotate faces around Y-axis (opposite direction)
                const tempD = faces.front;
                faces.front = faces.left;
                faces.left = faces.back;
                faces.back = faces.right;
                faces.right = tempD;
                break;

            case 'F': // Front face rotation (clockwise when looking at front face)
                // Rotate faces around Z-axis (front-back axis)
                const tempF = faces.top;
                faces.top = faces.left;
                faces.left = faces.bottom;
                faces.bottom = faces.right;
                faces.right = tempF;
                break;

            case 'B': // Back face rotation (clockwise when looking at back face)
                // Rotate faces around Z-axis (opposite direction)
                const tempB = faces.top;
                faces.top = faces.right;
                faces.right = faces.bottom;
                faces.bottom = faces.left;
                faces.left = tempB;
                break;
        }

        // Update the state
        state.faces = faces;
        this.cubes.set(cubeId, state);
    }

    // Get a string representation of cube orientations
    getCubeOrientationString(cubeId) {
        const state = this.cubes.get(cubeId);
        if (!state) return 'Unknown cube';
        
        const f = state.faces;
        return `Cube ${cubeId}: T=${f.top} B=${f.bottom} F=${f.front} K=${f.back} R=${f.right} L=${f.left}`;
    }

    // Get all cube states as a formatted string
    getAllCubeStates() {
        let result = '=== Cube Orientations ===\n';
        for (let [cubeId, state] of this.cubes) {
            result += this.getCubeOrientationString(cubeId) + '\n';
        }
        result += '=== End Cube Orientations ===';
        return result;
    }

    // Debug function to print current state
    printAllStates() {
        console.log(this.getAllCubeStates());
    }
}

// Initialize the cube state tracker
const cubeStateTracker = new CubeStateTracker();

// Initialize all cubes with their starting states
for (let z = 0; z < 3; z++) {
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            const cube = ThreeDCubeArray[z][y][x];
            const position = [x, y, z];
            cubeStateTracker.initializeCube(cube, position);
        }
    }
}

console.log('Cube state tracking initialized for', cubeStateTracker.cubes.size, 'cubes');

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
    const axis = getRotationAxis(face);
    const targetAngle = (Math.PI / 2) * (clockwise ? 1 : -1);
    
    // Store rotation data for each cube
    cubes.forEach(cube => {
        cube.userData.isRotating = true;
        cube.userData.rotationAxis = axis.clone();
        cube.userData.targetAngle = targetAngle;
        cube.userData.currentAngle = 0;
    });
    
    currentRotation = {
        cubes: cubes,
        face: face,
        targetAngle: targetAngle,
        currentAngle: 0,
        axis: axis
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

//TODO update tracking based on rotation input, then update the grouping of the regroup the cubes visually based on tracking to let the controls work correctly
// Function to update cube positions in the array after rotation
function updateCubeArray(face, clockwise) {
    // This would update the ThreeDCubeArray to reflect the new positions
    // Implementation depends on how you want to track the cube state
    // For now, we'll keep it simple and just update visual positions
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
        case 's':
            // Print current cube states (for debugging)
            if (!event.shiftKey) {
                console.log('Current cube states:');
                cubeStateTracker.printAllStates();
            }
            break;
    }
});

renderer.setAnimationLoop(render)

function render() {
    // Handle cube face rotations
    if (currentRotation) {
        const { cubes, targetAngle, axis } = currentRotation;
        
        // Calculate rotation step
        const rotationStep = Math.sign(targetAngle) * rotationSpeed;
        currentRotation.currentAngle += rotationStep;
        
        // Apply rotation to each individual cube in place
        cubes.forEach(cube => {
            if (cube.userData.isRotating) {
                // Rotate the cube in place around its own center
                cube.rotateOnAxis(axis, rotationStep);
                
                cube.userData.currentAngle += rotationStep;
            }
        });
        
        // Check if rotation is complete
        if (Math.abs(currentRotation.currentAngle) >= Math.abs(targetAngle)) {
            // Snap to exact angle for precision
            const remainingAngle = targetAngle - currentRotation.currentAngle;
            
            cubes.forEach(cube => {
                if (cube.userData.isRotating) {
                    // Apply final rotation step to snap to exact angle
                    cube.rotateOnAxis(axis, remainingAngle);
                    
                    // Update cube state tracking
                    cubeStateTracker.rotateCube(cube.userData.cubeId, currentRotation.face);
                    
                    // Clean up rotation data
                    cube.userData.isRotating = false;
                    cube.userData.currentAngle = 0;
                }
            });
            
            // Update cube array positions
            updateCubeArray(currentRotation.face, currentRotation.targetAngle > 0);
            
            // Log cube states after rotation
            console.log(`Rotation ${currentRotation.face} completed. Updated cube orientations:`);
            cubeStateTracker.printAllStates();
            
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