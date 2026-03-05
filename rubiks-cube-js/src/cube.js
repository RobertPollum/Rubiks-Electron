import * as THREE from 'three';
import { hexToInt } from './themes';

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