// The 3D view: scene, camera, orbit controls, and animated turns.
//
// CubeView knows how to draw and animate the cube. It knows nothing about
// games, scrambles, history or the DOM outside its own canvas. It reports
// each finished turn through `onMoveComplete` and lets the caller decide what
// that means.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
    generateCube3dArray,
    allCubies,
    disposeCubeMeshes,
    applyColorsToCubies,
    getFaceCubies,
    reindexCubies,
    isCubeSolved,
    serializeCubies,
    restoreCubies
} from './cubeMeshes';

const CANVAS_SCALE = 0.4; // canvas size as a fraction of the window
const ROTATION_SPEED = 0.1; // radians per frame
const QUARTER_TURN = Math.PI / 2;
const CAMERA_RESET_SPEED = 0.04;
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 3, 12);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

const AXES = {
    x: new THREE.Vector3(1, 0, 0),
    y: new THREE.Vector3(0, 1, 0),
    z: new THREE.Vector3(0, 0, 1)
};

// TODO: opposite faces currently turn the same world direction, so either
// R/U/F or L/D/B do not match standard notation. Fix once a pure cube model
// with tests exists in core/.
const FACE_AXES = { R: 'x', L: 'x', U: 'y', D: 'y', F: 'z', B: 'z' };

export class CubeView {
    /**
     * @param {Object} options
     * @param {string[]} options.colors  Six hex colours, in face material order.
     * @param {(move: {face: string, clockwise: boolean, isCubeRotation: boolean}) => void} [options.onMoveComplete]
     *        Called after each turn finishes, before the next queued turn starts.
     * @param {() => void} [options.onCameraResetComplete]
     * @param {() => number} [options.getSpeedMultiplier]  Scales turn speed (e.g. for replays).
     */
    constructor({ colors, onMoveComplete = () => {}, onCameraResetComplete = () => {}, getSpeedMultiplier = () => 1 }) {
        this.onMoveComplete = onMoveComplete;
        this.onCameraResetComplete = onCameraResetComplete;
        this.getSpeedMultiplier = getSpeedMultiplier;

        this.sizes = this._windowSizes();

        this.scene = new THREE.Scene();
        this.scene.add(new THREE.AmbientLight(0xffffff, 1.0));

        this.cubeArray = generateCube3dArray(3, this.scene, colors);

        this.camera = new THREE.PerspectiveCamera(75, this.sizes.width / this.sizes.height, 0.1, 1000);
        this.camera.position.copy(DEFAULT_CAMERA_POSITION);
        this.camera.lookAt(DEFAULT_CAMERA_TARGET);
        this.scene.add(this.camera);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.sizes.width, this.sizes.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Mouse/touch orbiting
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.rotateSpeed = 0.6;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 30;
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        // Turn animation state
        this.isRotating = false;
        this.rotationQueue = [];
        this.currentRotation = null;

        // Camera reset animation state
        this.cameraResetting = false;
        this.cameraResetAlpha = 0;
    }

    get domElement() {
        return this.renderer.domElement;
    }

    mount(container) {
        container.appendChild(this.renderer.domElement);
    }

    start() {
        this.renderer.setAnimationLoop(() => this._renderFrame());
    }

    // ---- Queries -------------------------------------------------------

    /** Number of turns waiting behind the one in progress. */
    get pendingCount() {
        return this.rotationQueue.length;
    }

    /** No turn animating and nothing queued. */
    isIdle() {
        return !this.isRotating && this.rotationQueue.length === 0;
    }

    isSolved() {
        return isCubeSolved(this.cubeArray);
    }

    serialize() {
        return serializeCubies(this.cubeArray);
    }

    // ---- Turns ---------------------------------------------------------

    /** Turn one face a quarter turn. Queued if another turn is animating. */
    rotateFace(face, clockwise = true) {
        if (this.isRotating) {
            this.rotationQueue.push({ face, clockwise, isCubeRotation: false });
            return;
        }
        this._beginRotation(getFaceCubies(this.cubeArray, face), {
            face,
            clockwise,
            axis: AXES[FACE_AXES[face]] || AXES.y,
            isCubeRotation: false
        });
    }

    /** Rotate the whole cube a quarter turn around x, y or z. */
    rotateCube(axis, clockwise = true) {
        if (this.isRotating) {
            this.rotationQueue.push({ face: axis, clockwise, isCubeRotation: true });
            return;
        }
        this._beginRotation(allCubies(this.cubeArray), {
            face: axis,
            clockwise,
            axis: AXES[axis] || AXES.y,
            isCubeRotation: true
        });
    }

    // ---- Whole-cube state ---------------------------------------------

    /**
     * Throw away the current cubies (cancelling any turns) and build a fresh,
     * solved cube with the given colours.
     */
    rebuild(colors) {
        if (this.currentRotation) {
            this._releaseFromGroup(this.currentRotation);
            this.currentRotation = null;
            this.isRotating = false;
        }
        this.rotationQueue = [];
        disposeCubeMeshes(this.scene, this.cubeArray);
        this.cubeArray = generateCube3dArray(3, this.scene, colors);
    }

    /** Apply a saved snapshot. Returns false if it could not be applied. */
    restore(savedCubies) {
        const restored = restoreCubies(this.cubeArray, savedCubies);
        if (!restored) return false;
        this.cubeArray = restored;
        return true;
    }

    applyColors(colors) {
        applyColorsToCubies(this.cubeArray, colors);
    }

    // ---- Camera / window ----------------------------------------------

    resetCamera() {
        this.cameraResetting = true;
        this.cameraResetAlpha = 0;
    }

    handleResize() {
        this.sizes = this._windowSizes();
        this.camera.aspect = this.sizes.width / this.sizes.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.sizes.width, this.sizes.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.controls.update();
    }

    // ---- Internals -----------------------------------------------------

    _windowSizes() {
        return {
            width: window.innerWidth * CANVAS_SCALE,
            height: window.innerHeight * CANVAS_SCALE
        };
    }

    _beginRotation(cubes, { face, clockwise, axis, isCubeRotation }) {
        this.isRotating = true;
        const group = new THREE.Group();
        this.scene.add(group);

        // Temporarily parent the moving cubies to a group we can spin
        cubes.forEach(cube => {
            const worldPosition = new THREE.Vector3();
            cube.getWorldPosition(worldPosition);
            this.scene.remove(cube);
            group.add(cube);
            group.worldToLocal(worldPosition);
            cube.position.copy(worldPosition);
        });

        this.currentRotation = {
            group,
            cubes,
            face,
            targetAngle: clockwise ? QUARTER_TURN : -QUARTER_TURN,
            currentAngle: 0,
            axis,
            isCubeRotation
        };
    }

    /** Move cubies out of a rotation group back into the scene, keeping their world transforms. */
    _releaseFromGroup({ group, cubes }) {
        cubes.forEach(cube => {
            const worldPosition = new THREE.Vector3();
            const worldQuaternion = new THREE.Quaternion();
            cube.getWorldPosition(worldPosition);
            cube.getWorldQuaternion(worldQuaternion);

            group.remove(cube);
            this.scene.add(cube);

            cube.position.copy(worldPosition);
            cube.quaternion.copy(worldQuaternion);
        });
        this.scene.remove(group);
    }

    _stepRotation() {
        const rotation = this.currentRotation;
        const { group, targetAngle, axis } = rotation;

        const step = Math.sign(targetAngle) * ROTATION_SPEED * this.getSpeedMultiplier();
        rotation.currentAngle += step;
        group.rotateOnAxis(axis, step);

        if (Math.abs(rotation.currentAngle) < Math.abs(targetAngle)) return;

        // Snap to the exact angle and hand the cubies back to the scene
        group.rotateOnAxis(axis, targetAngle - rotation.currentAngle);
        this._releaseFromGroup(rotation);
        this.cubeArray = reindexCubies(this.cubeArray);

        // Report while this turn is still "current" so listeners see the
        // same queue state the original implementation exposed.
        this.onMoveComplete({
            face: rotation.face,
            clockwise: rotation.targetAngle > 0,
            isCubeRotation: rotation.isCubeRotation
        });

        this.currentRotation = null;
        this.isRotating = false;

        if (this.rotationQueue.length > 0) {
            const next = this.rotationQueue.shift();
            if (next.isCubeRotation) {
                this.rotateCube(next.face, next.clockwise);
            } else {
                this.rotateFace(next.face, next.clockwise);
            }
        }
    }

    _stepCameraReset() {
        this.cameraResetAlpha += CAMERA_RESET_SPEED;
        if (this.cameraResetAlpha >= 1) {
            this.cameraResetAlpha = 1;
            this.cameraResetting = false;
            this.onCameraResetComplete();
        }
        this.camera.position.lerpVectors(
            this.camera.position.clone(),
            DEFAULT_CAMERA_POSITION,
            this.cameraResetAlpha
        );
        this.controls.target.lerp(DEFAULT_CAMERA_TARGET, this.cameraResetAlpha);
    }

    _renderFrame() {
        if (this.currentRotation) this._stepRotation();
        if (this.cameraResetting) this._stepCameraReset();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
