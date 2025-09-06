import * as THREE from 'three';

function createCube(arrayLength = 3) {
    if(arrayLength <= 0) {
        console.error("Array somehow is smaller than it should be")
    };
    const geometry = new THREE.BoxGeometry(arrayLength - .1, arrayLength - .1, arrayLength - .1);
    const textureArray = [
        new THREE.MeshStandardMaterial({ color: 0xff66ff }),
        new THREE.MeshStandardMaterial({ color: 0xffff66 }),
        new THREE.MeshStandardMaterial({ color: 0x66ffff }),
        new THREE.MeshStandardMaterial({ color: 0x6666ff }),
        new THREE.MeshStandardMaterial({ color: 0x66ff66 }),
        new THREE.MeshStandardMaterial({ color: 0xff6666 })
    ];
    return new THREE.Mesh(geometry, textureArray);
} 

function generateCubeRow(arrayLength = 3, yPosition, zPosition, scene) {
    let cubeRow = new Array();
    for(let i = -arrayLength; i<=arrayLength; i+=arrayLength) {
        let cube = createCube();
        cube.position.x = i;
        cube.position.y = yPosition;
        cube.position.z = zPosition;
        cubeRow.push(cube);
        scene.add(cube);
    }
    return cubeRow;
}

function generateCube2dArray(arrayLength = 3, zPosition, scene) {
    let cubeSide = new Array();
    for(let i= -arrayLength; i<=arrayLength; i+=arrayLength) {
        cubeSide.push(generateCubeRow(arrayLength, i, zPosition, scene));
    }
    return cubeSide;
}

export function generateCube3dArray(arrayLength = 3, scene) {
    let cube = new Array();
    for(let i= -arrayLength; i<=arrayLength; i+=arrayLength) {
        cube.push(generateCube2dArray(arrayLength, i, scene));
    }
    return cube;
}