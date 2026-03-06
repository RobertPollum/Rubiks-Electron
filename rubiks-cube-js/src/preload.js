// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge } = require('electron')
import { loadData, saveData, serializeCubies } from './storage';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { generateCube3dArray } from './cube';
import { THEMES, FACE_LABELS, getThemeColors, hexToInt, DEFAULT_THEME, isValidColorScheme, createPresetExport, parsePresetImport } from './themes';

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
// Load persisted data early so getActiveColors() works before cube generation
let gameData = loadData();
let sessionSolves = gameData.solves || [];

function getUserPresets() {
    return (gameData.settings && gameData.settings.userPresets) || [];
}

function getActiveColors() {
    const settings = gameData.settings || {};
    if (settings.customColors && Array.isArray(settings.customColors) && settings.customColors.length === 6) {
        return settings.customColors;
    }
    const themeId = settings.theme || DEFAULT_THEME;
    if (themeId.startsWith('user_')) {
        const presets = getUserPresets();
        const preset = presets.find(p => p.id === themeId);
        if (preset && isValidColorScheme(preset.colors)) return [...preset.colors];
    }
    return getThemeColors(themeId);
}

let ThreeDCubeArray = generateCube3dArray(3, scene, getActiveColors());
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 3, 12);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);
camera.position.copy(DEFAULT_CAMERA_POSITION);
camera.lookAt(DEFAULT_CAMERA_TARGET);
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

// Move tracking state
let moveHistory = [];
let isScrambling = false;
let scrambleMoveCount = 0;
let cubeState = 'solved'; // 'solved' | 'scrambled' | 'solving'

const FACE_NORMALS = [
    new THREE.Vector3(1, 0, 0),   // material 0: +X
    new THREE.Vector3(-1, 0, 0),  // material 1: -X
    new THREE.Vector3(0, 1, 0),   // material 2: +Y
    new THREE.Vector3(0, -1, 0),  // material 3: -Y
    new THREE.Vector3(0, 0, 1),   // material 4: +Z
    new THREE.Vector3(0, 0, -1),  // material 5: -Z
];

function getMaterialFacingDirection(cube, worldDir) {
    let bestDot = -Infinity;
    let bestIndex = 0;
    for (let i = 0; i < FACE_NORMALS.length; i++) {
        const localNormal = FACE_NORMALS[i].clone().applyQuaternion(cube.quaternion);
        const dot = localNormal.dot(worldDir);
        if (dot > bestDot) {
            bestDot = dot;
            bestIndex = i;
        }
    }
    return bestIndex;
}

function isCubeSolved() {
    const faceChecks = [
        { dir: new THREE.Vector3(1, 0, 0),  getCubes: () => { const c=[]; for(let y=0;y<3;y++) for(let z=0;z<3;z++) c.push(ThreeDCubeArray[z][y][2]); return c; } },
        { dir: new THREE.Vector3(-1, 0, 0), getCubes: () => { const c=[]; for(let y=0;y<3;y++) for(let z=0;z<3;z++) c.push(ThreeDCubeArray[z][y][0]); return c; } },
        { dir: new THREE.Vector3(0, 1, 0),  getCubes: () => { const c=[]; for(let x=0;x<3;x++) for(let z=0;z<3;z++) c.push(ThreeDCubeArray[z][2][x]); return c; } },
        { dir: new THREE.Vector3(0, -1, 0), getCubes: () => { const c=[]; for(let x=0;x<3;x++) for(let z=0;z<3;z++) c.push(ThreeDCubeArray[z][0][x]); return c; } },
        { dir: new THREE.Vector3(0, 0, 1),  getCubes: () => { const c=[]; for(let x=0;x<3;x++) for(let y=0;y<3;y++) c.push(ThreeDCubeArray[2][y][x]); return c; } },
        { dir: new THREE.Vector3(0, 0, -1), getCubes: () => { const c=[]; for(let x=0;x<3;x++) for(let y=0;y<3;y++) c.push(ThreeDCubeArray[0][y][x]); return c; } },
    ];

    for (const face of faceChecks) {
        const cubes = face.getCubes();
        const firstMat = getMaterialFacingDirection(cubes[0], face.dir);
        for (let i = 1; i < cubes.length; i++) {
            if (getMaterialFacingDirection(cubes[i], face.dir) !== firstMat) {
                return false;
            }
        }
    }
    return true;
}

function formatMoveNotation(face, clockwise) {
    return clockwise ? face : face + "'";
}

function logMove(face, clockwise) {
    const notation = formatMoveNotation(face, clockwise);
    moveHistory.push({ notation, timestamp: Date.now() });
    renderMoveList();
    updateMoveCount();
}

function renderMoveList() {
    const moveListEl = document.getElementById('move-list');
    if (!moveListEl) return;
    moveListEl.innerHTML = '';
    moveHistory.forEach((move, i) => {
        const div = document.createElement('div');
        div.className = 'move-entry';
        div.innerHTML = `<span class="move-num">${i + 1}.</span><span class="move-notation">${move.notation}</span>`;
        moveListEl.appendChild(div);
    });
    moveListEl.scrollTop = moveListEl.scrollHeight;
}

function updateMoveCount() {
    const el = document.getElementById('move-count');
    if (!el) return;
    el.textContent = `Moves: ${moveHistory.length}`;
}

function updateCubeStateUI(state) {
    cubeState = state;
    const el = document.getElementById('cube-state');
    if (!el) return;
    el.className = '';
    switch (state) {
        case 'solved':
            el.textContent = 'Solved';
            el.classList.add('state-solved');
            break;
        case 'scrambled':
            el.textContent = 'Scrambled';
            el.classList.add('state-scrambled');
            break;
        case 'solving':
            el.textContent = 'Solving';
            el.classList.add('state-solving');
            break;
    }
}

function persistGameState() {
    gameData.currentGame = {
        moveHistory: moveHistory,
        cubeState: cubeState,
        cubies: serializeCubies(ThreeDCubeArray)
    };
    gameData.solves = sessionSolves;
    updateStats();
    saveData(gameData);
}

function updateStats() {
    const solves = sessionSolves;
    gameData.stats = {
        totalSolves: solves.length,
        bestSolve: solves.length > 0 ? Math.min(...solves.map(s => s.moves)) : null,
        averageMoves: solves.length > 0 ? Math.round(solves.reduce((sum, s) => sum + s.moves, 0) / solves.length) : 0
    };
    renderStats();
}

function renderStats() {
    const el = document.getElementById('stats-display');
    if (!el) return;
    const { totalSolves, bestSolve, averageMoves } = gameData.stats;
    el.innerHTML = `<span>Total: <strong>${totalSolves}</strong></span>` +
        `<span>Best: <strong>${bestSolve !== null ? bestSolve : '-'}</strong></span>` +
        `<span>Avg: <strong>${averageMoves || '-'}</strong></span>`;
}

function recordSolve() {
    const solve = {
        moves: moveHistory.length,
        timestamp: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString()
    };
    sessionSolves.push(solve);
    renderSolveList();
    persistGameState();
}

function renderSolveList() {
    const el = document.getElementById('solve-list');
    if (!el) return;
    el.innerHTML = '';
    if (sessionSolves.length === 0) {
        el.innerHTML = '<div style="color:#888;font-style:italic;">No solves yet</div>';
        return;
    }
    sessionSolves.slice().reverse().forEach((solve, i) => {
        const div = document.createElement('div');
        div.className = 'solve-entry';
        div.innerHTML = `<span class="solve-moves">${solve.moves} moves</span> <span class="solve-time">${solve.timestamp} ${solve.date}</span>`;
        el.appendChild(div);
    });
}

function clearMoveHistory() {
    moveHistory = [];
    renderMoveList();
    updateMoveCount();
}

function restoreCubeState(savedCubies) {
    if (!savedCubies || savedCubies.length !== 27) return false;
    try {
        for (const saved of savedCubies) {
            const cube = ThreeDCubeArray[saved.index.z][saved.index.y][saved.index.x];
            if (!cube) return false;
            cube.position.set(saved.position.x, saved.position.y, saved.position.z);
            cube.quaternion.set(saved.quaternion.x, saved.quaternion.y, saved.quaternion.z, saved.quaternion.w);
        }
        updateCubeArray();
        return true;
    } catch (err) {
        console.error('Failed to restore cube state:', err);
        return false;
    }
}

function onRotationComplete(face, clockwise) {
    if (isScrambling) {
        scrambleMoveCount--;
        if (scrambleMoveCount <= 0) {
            isScrambling = false;
            updateCubeStateUI('scrambled');
            persistGameState();
        }
        return;
    }

    logMove(face, clockwise);

    if (cubeState !== 'solved') {
        if (cubeState === 'scrambled') {
            updateCubeStateUI('solving');
        }
        if (isCubeSolved()) {
            updateCubeStateUI('solved');
            recordSolve();
            const infoElement = document.getElementById('info');
            if (infoElement) {
                infoElement.textContent = `Cube solved in ${moveHistory.length} moves!`;
                infoElement.style.color = '#4CAF50';
                infoElement.style.fontWeight = 'bold';
            }
        }
    }

    persistGameState();
}

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
function updateCubeArray() {
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

const FACES = ['R', 'L', 'U', 'D', 'F', 'B'];
const SCRAMBLE_MOVE_COUNT = 25;

function scrambleCube() {
    if (isRotating || rotationQueue.length > 0) return;
    
    clearMoveHistory();
    isScrambling = true;
    scrambleMoveCount = SCRAMBLE_MOVE_COUNT;
    updateCubeStateUI('scrambled');
    
    let lastFace = null;
    for (let i = 0; i < SCRAMBLE_MOVE_COUNT; i++) {
        let face;
        do {
            face = FACES[Math.floor(Math.random() * FACES.length)];
        } while (face === lastFace);
        lastFace = face;
        const clockwise = Math.random() < 0.5;
        rotateFace(face, clockwise);
    }
    
    const infoElement = document.getElementById('info');
    if (infoElement) {
        infoElement.textContent = `Scrambling with ${SCRAMBLE_MOVE_COUNT} random moves...`;
        infoElement.style.color = '#FF9800';
        infoElement.style.fontWeight = 'bold';
    }
}

function resetCube() {
    // Cancel any in-progress or queued rotations
    if (currentRotation) {
        const { group, cubes } = currentRotation;
        
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
        
        // Reset rotation state
        currentRotation = null;
        isRotating = false;
    }
    rotationQueue = [];
    
    // Remove all existing cubes from the scene
    for (let z = 0; z < 3; z++) {
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                const cube = ThreeDCubeArray[z][y][x];
                if (cube) {
                    scene.remove(cube);
                    if (cube.geometry) cube.geometry.dispose();
                    if (Array.isArray(cube.material)) {
                        cube.material.forEach(m => m.dispose());
                    } else if (cube.material) {
                        cube.material.dispose();
                    }
                }
            }
        }
    }
    
    // Regenerate a fresh solved cube
    ThreeDCubeArray = generateCube3dArray(3, scene, getActiveColors());
    
    clearMoveHistory();
    isScrambling = false;
    scrambleMoveCount = 0;
    updateCubeStateUI('solved');
    persistGameState();
    
    const infoElement = document.getElementById('info');
    if (infoElement) {
        infoElement.textContent = 'Cube reset to solved state!';
        infoElement.style.color = '#2196F3';
        infoElement.style.fontWeight = 'bold';
        setTimeout(() => {
            infoElement.textContent = 'Ready for next move';
            infoElement.style.color = '#333';
        }, 1500);
    }
}

let cameraResetting = false;
let cameraResetAlpha = 0;
const CAMERA_RESET_SPEED = 0.04;

function resetCamera() {
    cameraResetting = true;
    cameraResetAlpha = 0;
    const infoElement = document.getElementById('info');
    if (infoElement) {
        infoElement.textContent = 'Resetting view...';
        infoElement.style.color = '#2196F3';
        infoElement.style.fontWeight = 'bold';
    }
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

// Settings modal state
let settingsOpen = false;

function applyColorsToExistingCube(colors) {
    for (let z = 0; z < 3; z++) {
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                const cube = ThreeDCubeArray[z][y][x];
                if (cube && Array.isArray(cube.material)) {
                    cube.material.forEach((mat, i) => {
                        if (i < colors.length) {
                            mat.color.set(typeof colors[i] === 'string' ? hexToInt(colors[i]) : colors[i]);
                        }
                    });
                }
            }
        }
    }
}

function applyTheme(themeId) {
    gameData.settings = gameData.settings || {};
    gameData.settings.theme = themeId;
    gameData.settings.customColors = null;
    let colors;
    if (themeId.startsWith('user_')) {
        const presets = getUserPresets();
        const preset = presets.find(p => p.id === themeId);
        colors = (preset && isValidColorScheme(preset.colors)) ? [...preset.colors] : getThemeColors(DEFAULT_THEME);
    } else {
        colors = getThemeColors(themeId);
    }
    applyColorsToExistingCube(colors);
    saveData(gameData);
    renderSettingsModal();
}

function applyCustomColor(faceIndex, hexColor) {
    gameData.settings = gameData.settings || {};
    if (!gameData.settings.customColors || !Array.isArray(gameData.settings.customColors)) {
        gameData.settings.customColors = getActiveColors();
    }
    gameData.settings.customColors[faceIndex] = hexColor;
    applyColorsToExistingCube(gameData.settings.customColors);
    saveData(gameData);
}

function openSettings() {
    settingsOpen = true;
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.add('visible');
        renderSettingsModal();
    }
}

function closeSettings() {
    settingsOpen = false;
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('visible');
    }
}

function savePreset(name) {
    if (!name || !name.trim()) return;
    gameData.settings = gameData.settings || {};
    if (!Array.isArray(gameData.settings.userPresets)) {
        gameData.settings.userPresets = [];
    }
    const id = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const colors = getActiveColors();
    gameData.settings.userPresets.push({
        id,
        name: name.trim().slice(0, 50),
        description: 'User preset: ' + name.trim(),
        colors: [...colors],
        createdAt: new Date().toISOString()
    });
    gameData.settings.theme = id;
    gameData.settings.customColors = null;
    saveData(gameData);
    renderSettingsModal();
}

function deletePreset(presetId) {
    if (!presetId || !presetId.startsWith('user_')) return;
    gameData.settings = gameData.settings || {};
    if (!Array.isArray(gameData.settings.userPresets)) return;
    gameData.settings.userPresets = gameData.settings.userPresets.filter(p => p.id !== presetId);
    if (gameData.settings.theme === presetId) {
        gameData.settings.theme = DEFAULT_THEME;
        applyColorsToExistingCube(getThemeColors(DEFAULT_THEME));
    }
    saveData(gameData);
    renderSettingsModal();
}

function exportColorScheme() {
    const currentColors = getActiveColors();
    const currentTheme = (gameData.settings && gameData.settings.theme) || DEFAULT_THEME;
    let name = 'Custom';
    if (currentTheme.startsWith('user_')) {
        const preset = getUserPresets().find(p => p.id === currentTheme);
        if (preset) name = preset.name;
    } else if (THEMES[currentTheme]) {
        name = THEMES[currentTheme].name;
    }
    const exportData = createPresetExport(name, currentColors);
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rubiks-theme-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importColorScheme() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const parsed = parsePresetImport(ev.target.result);
            if (!parsed) {
                alert('Invalid color scheme file. Expected a JSON file with a name and 6 hex colors.');
                return;
            }
            gameData.settings = gameData.settings || {};
            if (!Array.isArray(gameData.settings.userPresets)) {
                gameData.settings.userPresets = [];
            }
            const id = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
            gameData.settings.userPresets.push({
                id,
                name: parsed.name,
                description: parsed.description,
                colors: parsed.colors,
                createdAt: new Date().toISOString()
            });
            gameData.settings.theme = id;
            gameData.settings.customColors = null;
            applyColorsToExistingCube(parsed.colors);
            saveData(gameData);
            renderSettingsModal();
        };
        reader.readAsText(file);
    });
    input.click();
}

function renderSettingsModal() {
    const container = document.getElementById('settings-content');
    if (!container) return;

    const currentTheme = (gameData.settings && gameData.settings.theme) || DEFAULT_THEME;
    const currentColors = getActiveColors();
    const isCustom = gameData.settings && gameData.settings.customColors && Array.isArray(gameData.settings.customColors);
    const userPresets = getUserPresets();

    let html = '<div class="settings-section">';
    html += '<h4>Color Theme</h4>';
    html += '<div class="theme-grid">';
    for (const [id, theme] of Object.entries(THEMES)) {
        const isActive = !isCustom && currentTheme === id;
        html += `<button class="theme-btn ${isActive ? 'active' : ''}" data-theme="${id}" title="${theme.description}">`;
        html += `<div class="theme-preview">`;
        theme.colors.forEach(c => {
            html += `<span class="theme-swatch" style="background:${c}"></span>`;
        });
        html += `</div>`;
        html += `<span class="theme-name">${theme.name}</span>`;
        html += `</button>`;
    }
    html += '</div></div>';

    if (userPresets.length > 0) {
        html += '<div class="settings-section">';
        html += '<h4>Your Presets</h4>';
        html += '<div class="theme-grid">';
        for (const preset of userPresets) {
            const isActive = !isCustom && currentTheme === preset.id;
            html += `<div class="user-preset-wrapper">`;
            html += `<button class="theme-btn ${isActive ? 'active' : ''}" data-theme="${preset.id}" title="${preset.description}">`;
            html += `<div class="theme-preview">`;
            preset.colors.forEach(c => {
                html += `<span class="theme-swatch" style="background:${c}"></span>`;
            });
            html += `</div>`;
            html += `<span class="theme-name">${preset.name}</span>`;
            html += `</button>`;
            html += `<button class="preset-delete-btn" data-preset-id="${preset.id}" title="Delete preset">&times;</button>`;
            html += `</div>`;
        }
        html += '</div></div>';
    }

    html += '<div class="settings-section">';
    html += '<h4>Custom Face Colors</h4>';
    html += '<p class="settings-hint">Click a color to customize individual faces. Editing any color switches to custom mode.</p>';
    html += '<div class="face-colors">';
    FACE_LABELS.forEach((label, i) => {
        const color = currentColors[i];
        html += `<div class="face-color-row">`;
        html += `<label>${label}</label>`;
        html += `<div class="color-input-group">`;
        html += `<input type="color" class="face-color-picker" data-face="${i}" value="${color}">`;
        html += `<input type="text" class="face-color-hex" data-face="${i}" value="${color}" maxlength="7" spellcheck="false">`;
        html += `</div>`;
        html += `</div>`;
    });
    html += '</div>';
    if (isCustom) {
        html += `<button id="reset-to-theme-btn" class="settings-action-btn">Reset to ${THEMES[currentTheme]?.name || 'Standard'} theme</button>`;
    }
    html += '</div>';

    html += '<div class="settings-section">';
    html += '<h4>Save as Preset</h4>';
    html += '<div class="save-preset-row">';
    html += '<input type="text" id="preset-name-input" placeholder="Preset name..." maxlength="50" spellcheck="false">';
    html += '<button id="save-preset-btn" class="settings-action-btn">Save</button>';
    html += '</div></div>';

    html += '<div class="settings-section">';
    html += '<h4>Import / Export</h4>';
    html += '<p class="settings-hint">Share color schemes as JSON files.</p>';
    html += '<div class="import-export-row">';
    html += '<button id="export-btn" class="settings-action-btn">Export Current</button>';
    html += '<button id="import-btn" class="settings-action-btn">Import from File</button>';
    html += '</div></div>';

    container.innerHTML = html;

    // Theme buttons (built-in + user)
    container.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            applyTheme(btn.dataset.theme);
        });
    });

    // Delete user preset
    container.querySelectorAll('.preset-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const presetId = btn.dataset.presetId;
            const preset = userPresets.find(p => p.id === presetId);
            if (preset && confirm(`Delete preset "${preset.name}"?`)) {
                deletePreset(presetId);
            }
        });
    });

    // Face color pickers
    container.querySelectorAll('.face-color-picker').forEach(picker => {
        picker.addEventListener('input', (e) => {
            const faceIdx = parseInt(e.target.dataset.face);
            const hex = e.target.value;
            applyCustomColor(faceIdx, hex);
            const hexInput = container.querySelector(`.face-color-hex[data-face="${faceIdx}"]`);
            if (hexInput) hexInput.value = hex;
        });
    });

    // Face color hex inputs
    container.querySelectorAll('.face-color-hex').forEach(hexInput => {
        hexInput.addEventListener('change', (e) => {
            const faceIdx = parseInt(e.target.dataset.face);
            let hex = e.target.value.trim();
            if (!hex.startsWith('#')) hex = '#' + hex;
            if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
                applyCustomColor(faceIdx, hex);
                const picker = container.querySelector(`.face-color-picker[data-face="${faceIdx}"]`);
                if (picker) picker.value = hex;
            } else {
                e.target.value = getActiveColors()[faceIdx];
            }
        });
    });

    // Reset to theme
    const resetBtn = container.querySelector('#reset-to-theme-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            applyTheme(currentTheme);
        });
    }

    // Save preset
    const saveBtn = container.querySelector('#save-preset-btn');
    const nameInput = container.querySelector('#preset-name-input');
    if (saveBtn && nameInput) {
        saveBtn.addEventListener('click', () => {
            savePreset(nameInput.value);
        });
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') savePreset(nameInput.value);
            e.stopPropagation();
        });
        nameInput.addEventListener('keyup', (e) => e.stopPropagation());
        nameInput.addEventListener('keypress', (e) => e.stopPropagation());
    }

    // Export / Import
    const exportBtn = container.querySelector('#export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportColorScheme);
    const importBtn = container.querySelector('#import-btn');
    if (importBtn) importBtn.addEventListener('click', importColorScheme);
}

// Keyboard controls for cube rotations
document.addEventListener('keydown', (event) => {
    if (settingsOpen) {
        if (event.key === 'Escape') closeSettings();
        return;
    }
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
        case ' ':
            event.preventDefault();
            resetCamera();
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
            updateCubeArray();
            
            // Track the completed move
            onRotationComplete(currentRotation.face, currentRotation.targetAngle > 0);
            
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
    if (cameraResetting) {
        cameraResetAlpha += CAMERA_RESET_SPEED;
        if (cameraResetAlpha >= 1) {
            cameraResetAlpha = 1;
            cameraResetting = false;
            const infoElement = document.getElementById('info');
            if (infoElement) {
                infoElement.textContent = 'Ready for next move';
                infoElement.style.color = '#333';
                infoElement.style.fontWeight = 'normal';
            }
        }
        camera.position.lerpVectors(
            camera.position.clone(),
            DEFAULT_CAMERA_POSITION,
            cameraResetAlpha
        );
        controls.target.lerp(DEFAULT_CAMERA_TARGET, cameraResetAlpha);
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
   document.getElementById('main-content').appendChild(renderer.domElement);

   document.getElementById('scrambleBtn').addEventListener('click', () => {
       scrambleCube();
   });
   document.getElementById('resetBtn').addEventListener('click', () => {
       resetCube();
   });
   document.getElementById('settingsBtn').addEventListener('click', () => {
       openSettings();
   });
   document.getElementById('settings-close').addEventListener('click', () => {
       closeSettings();
   });
   document.getElementById('settings-modal').addEventListener('click', (e) => {
       if (e.target.id === 'settings-modal') closeSettings();
   });

   renderSolveList();
   renderStats();

   const saved = gameData.currentGame;
   if (saved && saved.cubies && saved.cubeState !== 'solved') {
       const restored = restoreCubeState(saved.cubies);
       if (restored) {
           moveHistory = saved.moveHistory || [];
           renderMoveList();
           updateMoveCount();
           updateCubeStateUI(saved.cubeState);
           const infoElement = document.getElementById('info');
           if (infoElement) {
               infoElement.textContent = 'Resumed previous game';
               infoElement.style.color = '#FF9800';
           }
       } else {
           updateCubeStateUI('solved');
       }
   } else {
       updateCubeStateUI('solved');
   }
});