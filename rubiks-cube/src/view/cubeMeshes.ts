// three.js meshes for the cubies, and painting them from a cube state.
//
// Cubies never move permanently: they sit on a fixed grid with no rotation,
// and their face colours are repainted from the model after each turn. Only
// the turn animation moves them, temporarily. Only the outer shell of cubies
// is created; the inside of a cube is never visible.

import * as THREE from 'three';
import { FACE_ORDER, FACE_NORMALS, findSlot, gridCoords } from '../core/cubeModel';
import { hexToInt } from '../core/themes';
import type { Vec3 } from '../core/cubeModel';
import type { CubeState, Palette } from '../core/types';

/** A cubie mesh: one box with a material per face. */
export type Cubie = THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial[]>;

/** World units between cubie centres. The view scales the cube so every size looks the same overall. */
export const SPACING = 3;
const CUBIE_SIZE = SPACING - 0.1; // leaves a small gap between cubies
const INNER_COLOR = 0x111111; // faces that point into the cube

/** A cubie's position in model coordinates (see core/cubeModel.ts). */
export const gridPos = (cubie: Cubie) => cubie.userData.gridPos as Vec3;

/** Create the outer cubies of a `size` cube and add them to `parent`. */
export function createCubies(parent: THREE.Object3D, size: number): Cubie[] {
    const geometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
    const coords = gridCoords(size);
    const outer = size - 1;
    const cubies: Cubie[] = [];
    for (const x of coords) {
        for (const y of coords) {
            for (const z of coords) {
                if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) !== outer) continue; // hidden inside
                // One material per box face, in FACE_ORDER (+X, -X, +Y, -Y, +Z, -Z)
                const materials = FACE_ORDER.map(() => new THREE.MeshStandardMaterial({ color: INNER_COLOR }));
                const cubie: Cubie = new THREE.Mesh(geometry, materials);
                cubie.userData.gridPos = [x, y, z];
                parent.add(cubie);
                cubies.push(cubie);
            }
        }
    }
    resetCubieTransforms(cubies, parent);
    return cubies;
}

/** Remove cubies from the scene and free their GPU resources. */
export function disposeCubies(cubies: Cubie[]): void {
    const geometries = new Set<THREE.BufferGeometry>();
    for (const cubie of cubies) {
        cubie.removeFromParent();
        geometries.add(cubie.geometry);
        cubie.material.forEach(m => m.dispose());
    }
    geometries.forEach(g => g.dispose());
}

/** Put every cubie back on its grid spot, unrotated, under `parent`. */
export function resetCubieTransforms(cubies: Cubie[], parent: THREE.Object3D): void {
    for (const cubie of cubies) {
        if (cubie.parent !== parent) parent.add(cubie);
        const [x, y, z] = gridPos(cubie);
        // Model coordinates are doubled, so halve them to get grid steps.
        cubie.position.set((x * SPACING) / 2, (y * SPACING) / 2, (z * SPACING) / 2);
        cubie.quaternion.identity();
    }
}

/** Colour every visible sticker from `state` using the six `palette` colours. */
export function paintCubies(cubies: Cubie[], state: CubeState, palette: Palette, size: number): void {
    for (const cubie of cubies) {
        const pos = gridPos(cubie);
        FACE_ORDER.forEach((face, i) => {
            const slot = findSlot(pos, FACE_NORMALS[face], size);
            cubie.material[i].color.set(slot >= 0 ? hexToInt(palette[state[slot]]) : INNER_COLOR);
        });
    }
}
