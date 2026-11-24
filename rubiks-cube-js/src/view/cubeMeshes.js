// three.js meshes for the 27 cubies, plus queries over them.
//
// NOTE: the cube's logical state currently *is* these meshes (their positions
// and quaternions). A pure model in core/ should eventually own the state and
// this file should only draw it.

import * as THREE from 'three';
import { hexToInt } from '../core/themes';

function createCube(arrayLength = 3, colors) {
    if(arrayLength <= 0) {
        console.error("Array somehow is smaller than it should be")
    };
    const geometry = new THREE.BoxGeometry(arrayLength - .1, arrayLength - .1, arrayLength - .1);
    const textureArray = colors.map(c =>
        new THREE.MeshStandardMaterial({ color: typeof c === 'string' ? hexToInt(c) : c })
    );
    return new THREE.Mesh(geometry, textureArray);
} 

function generateCubeRow(arrayLength = 3, yPosition, zPosition, scene, colors) {
    let cubeRow = new Array();
    for(let i = -arrayLength; i<=arrayLength; i+=arrayLength) {
        let cube = createCube(arrayLength, colors);
        cube.position.x = i;
        cube.position.y = yPosition;
        cube.position.z = zPosition;
        cubeRow.push(cube);
        scene.add(cube);
    }
    return cubeRow;
}

function generateCube2dArray(arrayLength = 3, zPosition, scene, colors) {
    let cubeSide = new Array();
    for(let i= -arrayLength; i<=arrayLength; i+=arrayLength) {
        cubeSide.push(generateCubeRow(arrayLength, i, zPosition, scene, colors));
    }
    return cubeSide;
}

export function generateCube3dArray(arrayLength = 3, scene, colors) {
    let cube = new Array();
    for(let i= -arrayLength; i<=arrayLength; i+=arrayLength) {
        cube.push(generateCube2dArray(arrayLength, i, scene, colors));
    }
    return cube;
}

// The grid is indexed [z][y][x], each 0..2 (0 = negative side of the axis).
const SIZE = 3;

/** Visit every cubie in the [z][y][x] grid. */
export function forEachCubie(cubeArray, fn) {
    for (let z = 0; z < SIZE; z++) {
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                fn(cubeArray[z][y][x], { x, y, z });
            }
        }
    }
}

export function allCubies(cubeArray) {
    const cubes = [];
    forEachCubie(cubeArray, cube => cubes.push(cube));
    return cubes;
}

/** Remove every cubie from the scene and free its GPU resources. */
export function disposeCubeMeshes(scene, cubeArray) {
    forEachCubie(cubeArray, cube => {
        if (!cube) return;
        scene.remove(cube);
        if (cube.geometry) cube.geometry.dispose();
        if (Array.isArray(cube.material)) {
            cube.material.forEach(m => m.dispose());
        } else if (cube.material) {
            cube.material.dispose();
        }
    });
}

/** Recolour the faces of existing cubies in place. */
export function applyColorsToCubies(cubeArray, colors) {
    forEachCubie(cubeArray, cube => {
        if (cube && Array.isArray(cube.material)) {
            cube.material.forEach((mat, i) => {
                if (i < colors.length) {
                    mat.color.set(typeof colors[i] === 'string' ? hexToInt(colors[i]) : colors[i]);
                }
            });
        }
    });
}

/** Cubies in the layer that a face turn moves. */
export function getFaceCubies(cubeArray, face) {
    const cubes = [];
    switch (face) {
        case 'R': // x = +1
            for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++) cubes.push(cubeArray[z][y][2]);
            break;
        case 'L': // x = -1
            for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++) cubes.push(cubeArray[z][y][0]);
            break;
        case 'U': // y = +1
            for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) cubes.push(cubeArray[z][2][x]);
            break;
        case 'D': // y = -1
            for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) cubes.push(cubeArray[z][0][x]);
            break;
        case 'F': // z = +1
            for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) cubes.push(cubeArray[2][y][x]);
            break;
        case 'B': // z = -1
            for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) cubes.push(cubeArray[0][y][x]);
            break;
    }
    return cubes;
}

/** Rebuild the [z][y][x] grid from where each cubie now sits in world space. */
export function reindexCubies(cubeArray) {
    const newArray = [
        [[null, null, null], [null, null, null], [null, null, null]],
        [[null, null, null], [null, null, null], [null, null, null]],
        [[null, null, null], [null, null, null], [null, null, null]]
    ];
    const toIndex = v => (v < -2 ? 0 : v > 2 ? 2 : 1);
    for (const cube of allCubies(cubeArray)) {
        const pos = cube.position;
        newArray[toIndex(pos.z)][toIndex(pos.y)][toIndex(pos.x)] = cube;
    }
    return newArray;
}

// Local face normals in material order: [+X, -X, +Y, -Y, +Z, -Z]
const FACE_NORMALS = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
];

/** Index of the cubie material currently facing `worldDir`. */
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

const FACE_DIRECTIONS = {
    R: new THREE.Vector3(1, 0, 0),
    L: new THREE.Vector3(-1, 0, 0),
    U: new THREE.Vector3(0, 1, 0),
    D: new THREE.Vector3(0, -1, 0),
    F: new THREE.Vector3(0, 0, 1),
    B: new THREE.Vector3(0, 0, -1),
};

/** True when every outer face shows a single colour. */
export function isCubeSolved(cubeArray) {
    for (const [face, dir] of Object.entries(FACE_DIRECTIONS)) {
        const cubes = getFaceCubies(cubeArray, face);
        const firstMat = getMaterialFacingDirection(cubes[0], dir);
        for (let i = 1; i < cubes.length; i++) {
            if (getMaterialFacingDirection(cubes[i], dir) !== firstMat) {
                return false;
            }
        }
    }
    return true;
}

/** Plain-object snapshot of every cubie's transform, for saving. */
export function serializeCubies(cubeArray) {
    const cubies = [];
    forEachCubie(cubeArray, (cube, index) => {
        if (!cube) return;
        cubies.push({
            index,
            position: { x: cube.position.x, y: cube.position.y, z: cube.position.z },
            quaternion: { x: cube.quaternion.x, y: cube.quaternion.y, z: cube.quaternion.z, w: cube.quaternion.w }
        });
    });
    return cubies;
}

/**
 * Apply a saved snapshot to freshly generated cubies. Returns the re-indexed
 * grid, or null if the snapshot doesn't fit.
 */
export function restoreCubies(cubeArray, savedCubies) {
    if (!savedCubies || savedCubies.length !== 27) return null;
    try {
        for (const saved of savedCubies) {
            const cube = cubeArray[saved.index.z][saved.index.y][saved.index.x];
            if (!cube) return null;
            cube.position.set(saved.position.x, saved.position.y, saved.position.z);
            cube.quaternion.set(saved.quaternion.x, saved.quaternion.y, saved.quaternion.z, saved.quaternion.w);
        }
        return reindexCubies(cubeArray);
    } catch (err) {
        console.error('Failed to restore cube state:', err);
        return null;
    }
}
