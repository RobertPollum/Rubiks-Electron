// three.js meshes for the 27 cubies, and painting them from a cube state.
//
// Cubies never move permanently: they sit on a fixed 3x3x3 grid with no
// rotation, and their face colours are repainted from the model after each
// turn. Only the turn animation moves them, temporarily.

import * as THREE from 'three';
import { FACE_ORDER, FACE_NORMALS, findSlot } from '../core/cubeModel';
import { hexToInt } from '../core/themes';
import type { Vec3 } from '../core/cubeModel';
import type { CubeState, Palette } from '../core/types';

/** A cubie mesh: one box with a material per face. */
export type Cubie = THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial[]>;

const gridPos = (cubie: Cubie) => cubie.userData.gridPos as Vec3;

const SPACING = 3; // distance between cubie centres
const CUBIE_SIZE = SPACING - 0.1; // leaves a small gap between cubies
const INNER_COLOR = 0x111111; // faces that point into the cube

/**
 * Create the cubies and add them to `parent`.
 * Each cubie's `userData.gridPos` is its [x, y, z] position (-1, 0 or 1).
 */
export function createCubies(parent: THREE.Object3D): Cubie[] {
    const geometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
    const cubies: Cubie[] = [];
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                // One material per box face, in FACE_ORDER (+X, -X, +Y, -Y, +Z, -Z)
                const materials = FACE_ORDER.map(() => new THREE.MeshStandardMaterial({ color: INNER_COLOR }));
                const cubie = new THREE.Mesh(geometry, materials);
                cubie.userData.gridPos = [x, y, z];
                parent.add(cubie);
                cubies.push(cubie);
            }
        }
    }
    resetCubieTransforms(cubies, parent);
    return cubies;
}

/** Put every cubie back on its grid spot, unrotated, under `parent`. */
export function resetCubieTransforms(cubies: Cubie[], parent: THREE.Object3D): void {
    for (const cubie of cubies) {
        if (cubie.parent !== parent) parent.add(cubie);
        const [x, y, z] = gridPos(cubie);
        cubie.position.set(x * SPACING, y * SPACING, z * SPACING);
        cubie.quaternion.identity();
    }
}

/** Colour every visible sticker from `state` using the six `palette` colours. */
export function paintCubies(cubies: Cubie[], state: CubeState, palette: Palette): void {
    for (const cubie of cubies) {
        const pos = gridPos(cubie);
        FACE_ORDER.forEach((face, i) => {
            const slot = findSlot(pos, FACE_NORMALS[face]);
            cubie.material[i].color.set(slot >= 0 ? hexToInt(palette[state[slot]]) : INNER_COLOR);
        });
    }
}
