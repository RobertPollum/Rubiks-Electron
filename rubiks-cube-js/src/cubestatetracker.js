import * as THREE from 'three';

// Cube State Tracking System
export class CubeStateTracker {
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

    // Get the current local axis for a cube based on its orientation
    getCurrentRotationAxis(cubeId, faceRotation) {
        const state = this.cubes.get(cubeId);
        if (!state) return new THREE.Vector3(0, 1, 0);

        const faces = state.faces;
        
        // Find which current face corresponds to the rotation direction
        let targetAxis = new THREE.Vector3(0, 1, 0); // default

        switch(faceRotation) {
            case 'R': // Right face rotation
                // Find which current local axis points right
                if (faces.right === 'R') targetAxis = new THREE.Vector3(1, 0, 0);
                else if (faces.right === 'L') targetAxis = new THREE.Vector3(-1, 0, 0);
                else if (faces.right === 'U') targetAxis = new THREE.Vector3(0, 1, 0);
                else if (faces.right === 'D') targetAxis = new THREE.Vector3(0, -1, 0);
                else if (faces.right === 'F') targetAxis = new THREE.Vector3(0, 0, 1);
                else if (faces.right === 'B') targetAxis = new THREE.Vector3(0, 0, -1);
                break;

            case 'L': // Left face rotation
                // Find which current local axis points left
                if (faces.left === 'R') targetAxis = new THREE.Vector3(-1, 0, 0); // opposite direction
                else if (faces.left === 'L') targetAxis = new THREE.Vector3(1, 0, 0);
                else if (faces.left === 'U') targetAxis = new THREE.Vector3(0, -1, 0);
                else if (faces.left === 'D') targetAxis = new THREE.Vector3(0, 1, 0);
                else if (faces.left === 'F') targetAxis = new THREE.Vector3(0, 0, -1);
                else if (faces.left === 'B') targetAxis = new THREE.Vector3(0, 0, 1);
                break;

            case 'U': // Up face rotation
                // Find which current local axis points up
                if (faces.top === 'R') targetAxis = new THREE.Vector3(1, 0, 0);
                else if (faces.top === 'L') targetAxis = new THREE.Vector3(-1, 0, 0);
                else if (faces.top === 'U') targetAxis = new THREE.Vector3(0, 1, 0);
                else if (faces.top === 'D') targetAxis = new THREE.Vector3(0, -1, 0);
                else if (faces.top === 'F') targetAxis = new THREE.Vector3(0, 0, 1);
                else if (faces.top === 'B') targetAxis = new THREE.Vector3(0, 0, -1);
                break;

            case 'D': // Down face rotation
                // Find which current local axis points down
                if (faces.bottom === 'R') targetAxis = new THREE.Vector3(-1, 0, 0); // opposite direction
                else if (faces.bottom === 'L') targetAxis = new THREE.Vector3(1, 0, 0);
                else if (faces.bottom === 'U') targetAxis = new THREE.Vector3(0, -1, 0);
                else if (faces.bottom === 'D') targetAxis = new THREE.Vector3(0, 1, 0);
                else if (faces.bottom === 'F') targetAxis = new THREE.Vector3(0, 0, -1);
                else if (faces.bottom === 'B') targetAxis = new THREE.Vector3(0, 0, 1);
                break;

            case 'F': // Front face rotation
                // Find which current local axis points front
                if (faces.front === 'R') targetAxis = new THREE.Vector3(1, 0, 0);
                else if (faces.front === 'L') targetAxis = new THREE.Vector3(-1, 0, 0);
                else if (faces.front === 'U') targetAxis = new THREE.Vector3(0, 1, 0);
                else if (faces.front === 'D') targetAxis = new THREE.Vector3(0, -1, 0);
                else if (faces.front === 'F') targetAxis = new THREE.Vector3(0, 0, 1);
                else if (faces.front === 'B') targetAxis = new THREE.Vector3(0, 0, -1);
                break;

            case 'B': // Back face rotation
                // Find which current local axis points back
                if (faces.back === 'R') targetAxis = new THREE.Vector3(-1, 0, 0); // opposite direction
                else if (faces.back === 'L') targetAxis = new THREE.Vector3(1, 0, 0);
                else if (faces.back === 'U') targetAxis = new THREE.Vector3(0, -1, 0);
                else if (faces.back === 'D') targetAxis = new THREE.Vector3(0, 1, 0);
                else if (faces.back === 'F') targetAxis = new THREE.Vector3(0, 0, -1);
                else if (faces.back === 'B') targetAxis = new THREE.Vector3(0, 0, 1);
                break;
        }

        return targetAxis;
    }
}
