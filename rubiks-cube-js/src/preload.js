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

// Matrix tracking system for individual cubes
class CubeTracker {
    constructor() {
        this.cubePositions = new Map(); // Maps cube ID to logical position [x, y, z]
        this.positionToCube = new Map(); // Maps position string to cube ID
        this.cubeIdCounter = 0;
    }

    // Initialize tracking for all cubes
    initializeCubeTracking(cubeArray) {
        for (let z = 0; z < 3; z++) {
            for (let y = 0; y < 3; y++) {
                for (let x = 0; x < 3; x++) {
                    const cube = cubeArray[z][y][x];
                    const cubeId = this.cubeIdCounter++;
                    const position = [x, y, z];
                    
                    // Store cube ID in userData for reference
                    cube.userData.cubeId = cubeId;
                    cube.userData.logicalPosition = [...position];
                    
                    // Track positions
                    this.cubePositions.set(cubeId, position);
                    this.positionToCube.set(this.positionKey(position), cubeId);
                }
            }
        }
    }

    // Generate position key for mapping
    positionKey(position) {
        return `${position[0]},${position[1]},${position[2]}`;
    }

    // Get cube at logical position
    getCubeAtPosition(x, y, z) {
        const key = this.positionKey([x, y, z]);
        const cubeId = this.positionToCube.get(key);
        if (cubeId !== undefined) {
            // Find the actual cube object
            for (let zi = 0; zi < 3; zi++) {
                for (let yi = 0; yi < 3; yi++) {
                    for (let xi = 0; xi < 3; xi++) {
                        const cube = ThreeDCubeArray[zi][yi][xi];
                        if (cube.userData.cubeId === cubeId) {
                            return cube;
                        }
                    }
                }
            }
        }
        return null;
    }

    // Update cube position after rotation
    updateCubePosition(cubeId, newPosition) {
        const oldPosition = this.cubePositions.get(cubeId);
        if (oldPosition) {
            // Remove old position mapping
            this.positionToCube.delete(this.positionKey(oldPosition));
        }
        
        // Set new position
        this.cubePositions.set(cubeId, newPosition);
        this.positionToCube.set(this.positionKey(newPosition), cubeId);
    }
}

// Matrix transformation utilities
class MatrixTransformations {
    // Create rotation matrix for 90-degree rotations around each axis
    static getRotationMatrix(axis, clockwise = true) {
        const angle = clockwise ? -Math.PI / 2 : Math.PI / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        switch (axis) {
            case 'x': // Right/Left face rotations
                return new THREE.Matrix3().set(
                    1, 0, 0,
                    0, cos, -sin,
                    0, sin, cos
                );
            case 'y': // Up/Down face rotations
                return new THREE.Matrix3().set(
                    cos, 0, sin,
                    0, 1, 0,
                    -sin, 0, cos
                );
            case 'z': // Front/Back face rotations
                return new THREE.Matrix3().set(
                    cos, -sin, 0,
                    sin, cos, 0,
                    0, 0, 1
                );
            default:
                return new THREE.Matrix3().identity();
        }
    }

    // Apply matrix transformation to a position vector
    static transformPosition(position, matrix, center = [1, 1, 1]) {
        // Convert to center-relative coordinates
        const relativePos = [
            position[0] - center[0],
            position[1] - center[1],
            position[2] - center[2]
        ];
        
        // Apply matrix transformation
        const vector = new THREE.Vector3(relativePos[0], relativePos[1], relativePos[2]);
        vector.applyMatrix3(matrix);
        
        // Convert back to absolute coordinates and round to handle floating point precision
        return [
            Math.round(vector.x + center[0]),
            Math.round(vector.y + center[1]),
            Math.round(vector.z + center[2])
        ];
    }

    // Get positions of cubes that belong to a specific face
    static getFacePositions(face) {
        const positions = [];
        
        switch(face) {
            case 'R': // Right face (x = 2)
                for(let y = 0; y < 3; y++) {
                    for(let z = 0; z < 3; z++) {
                        positions.push([2, y, z]);
                    }
                }
                break;
            case 'L': // Left face (x = 0)
                for(let y = 0; y < 3; y++) {
                    for(let z = 0; z < 3; z++) {
                        positions.push([0, y, z]);
                    }
                }
                break;
            case 'U': // Up face (y = 2)
                for(let x = 0; x < 3; x++) {
                    for(let z = 0; z < 3; z++) {
                        positions.push([x, 2, z]);
                    }
                }
                break;
            case 'D': // Down face (y = 0)
                for(let x = 0; x < 3; x++) {
                    for(let z = 0; z < 3; z++) {
                        positions.push([x, 0, z]);
                    }
                }
                break;
            case 'F': // Front face (z = 2)
                for(let x = 0; x < 3; x++) {
                    for(let y = 0; y < 3; y++) {
                        positions.push([x, y, 2]);
                    }
                }
                break;
            case 'B': // Back face (z = 0)
                for(let x = 0; x < 3; x++) {
                    for(let y = 0; y < 3; y++) {
                        positions.push([x, y, 0]);
                    }
                }
                break;
        }
        
        return positions;
    }

    // Get rotation axis for face
    static getRotationAxis(face) {
        switch(face) {
            case 'R':
            case 'L':
                return 'x';
            case 'U':
            case 'D':
                return 'y';
            case 'F':
            case 'B':
                return 'z';
            default:
                return 'y';
        }
    }
}

// Initialize the cube tracker
const cubeTracker = new CubeTracker();

// Initialize cube tracking after the 3D array is created
cubeTracker.initializeCubeTracking(ThreeDCubeArray);
console.log('Cube tracking system initialized with', cubeTracker.cubePositions.size, 'cubes');

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
    const facePositions = MatrixTransformations.getFacePositions(face);

    facePositions.forEach(position => {
        const cube = cubeTracker.getCubeAtPosition(position[0], position[1], position[2]);
        if (cube) {
            cubes.push(cube);
        } else {
            console.warn(`No cube found at logical position ${position} for face ${face}`);
        }
    });

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

// Function to update cube positions in the array after rotation using matrix transformations
function updateCubeArray(face, clockwise) {
    console.log(`Updating cube array for ${face} face, clockwise: ${clockwise}`);
    
    // Get the rotation axis and matrix for this face rotation
    const axis = MatrixTransformations.getRotationAxis(face);
    const rotationMatrix = MatrixTransformations.getRotationMatrix(axis, clockwise);
    
    // Get all positions that belong to this face
    const facePositions = MatrixTransformations.getFacePositions(face);
    
    // Store the cubes and their new positions
    const cubesToMove = [];
    const newPositions = [];
    
    // Calculate new positions using matrix transformation
    facePositions.forEach(position => {
        const cube = cubeTracker.getCubeAtPosition(position[0], position[1], position[2]);
        if (cube) {
            // Transform the logical position using the rotation matrix
            const newPosition = MatrixTransformations.transformPosition(position, rotationMatrix);
            
            // Ensure the new position is within bounds [0,2] for each axis
            newPosition[0] = Math.max(0, Math.min(2, newPosition[0]));
            newPosition[1] = Math.max(0, Math.min(2, newPosition[1]));
            newPosition[2] = Math.max(0, Math.min(2, newPosition[2]));
            
            cubesToMove.push(cube);
            newPositions.push(newPosition);
            
            console.log(`Cube ${cube.userData.cubeId}: ${position} -> ${newPosition}`);
        }
    });
    
    // Update the tracking system with new positions
    cubesToMove.forEach((cube, index) => {
        const newPosition = newPositions[index];
        
        // Update cube tracker
        cubeTracker.updateCubePosition(cube.userData.cubeId, newPosition);
        
        // Update cube's logical position
        cube.userData.logicalPosition = [...newPosition];
    });
    
    // Rebuild the ThreeDCubeArray based on new logical positions
    rebuildCubeArray();
    
    console.log('Cube array updated successfully');
}

// Function to rebuild the 3D cube array based on current logical positions
function rebuildCubeArray() {
    // Create a new 3D array structure
    const newArray = Array(3).fill(null).map(() => 
        Array(3).fill(null).map(() => 
            Array(3).fill(null)
        )
    );
    
    // Place each cube in its new logical position
    for (let z = 0; z < 3; z++) {
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                const cube = cubeTracker.getCubeAtPosition(x, y, z);
                if (cube) {
                    newArray[z][y][x] = cube;
                } else {
                    console.warn(`No cube found at position [${x}, ${y}, ${z}]`);
                }
            }
        }
    }
    
    // Replace the global array
    ThreeDCubeArray = newArray;
    
    // Validate the rebuild
    validateCubeArray();
}

// Function to validate that all cubes are properly tracked
function validateCubeArray() {
    let cubeCount = 0;
    let missingCubes = 0;
    
    for (let z = 0; z < 3; z++) {
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                if (ThreeDCubeArray[z][y][x]) {
                    cubeCount++;
                    const cube = ThreeDCubeArray[z][y][x];
                    const logicalPos = cube.userData.logicalPosition;
                    
                    // Verify logical position matches array position
                    if (logicalPos[0] !== x || logicalPos[1] !== y || logicalPos[2] !== z) {
                        console.warn(`Position mismatch for cube ${cube.userData.cubeId}: 
                            Array position [${x}, ${y}, ${z}] vs Logical position [${logicalPos[0]}, ${logicalPos[1]}, ${logicalPos[2]}]`);
                    }
                } else {
                    missingCubes++;
                    console.warn(`Missing cube at array position [${x}, ${y}, ${z}]`);
                }
            }
        }
    }
    
    console.log(`Cube validation: ${cubeCount} cubes found, ${missingCubes} missing cubes`);
}

// Debug function to print current cube positions
function debugCubePositions() {
    console.log('=== Current Cube Positions ===');
    for (let z = 0; z < 3; z++) {
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                const cube = ThreeDCubeArray[z][y][x];
                if (cube) {
                    const logicalPos = cube.userData.logicalPosition;
                    const worldPos = cube.position;
                    console.log(`Cube ${cube.userData.cubeId}: Array[${z}][${y}][${x}], Logical[${logicalPos[0]}, ${logicalPos[1]}, ${logicalPos[2]}], World(${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)}, ${worldPos.z.toFixed(1)})`);
                }
            }
        }
    }
    console.log('=== End Cube Positions ===');
}

// Function to log the cube state after a rotation is complete
function logCubeStateAfterRotation() {
    console.log('Rotation finished. Current cube state:\n' + getCubeStateString());
}

// Function to get cube state as a string (useful for debugging)
function getCubeStateString() {
    let state = '';
    for (let z = 0; z < 3; z++) {
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                const cube = ThreeDCubeArray[z][y][x];
                if (cube) {
                    state += cube.userData.cubeId.toString().padStart(2, '0') + ' ';
                } else {
                    state += '-- ';
                }
            }
            state += '| ';
        }
        state += '\n';
    }
    return state;
}

// Add keyboard shortcut for debugging (press 'p' to print positions)
document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'p' && !event.shiftKey) {
        debugCubePositions();
        console.log('Current cube state:\n' + getCubeStateString());
    }
});

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

            // Log the cube state for debugging
            logCubeStateAfterRotation();
            
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

logCubeStateAfterRotation() //track initial state