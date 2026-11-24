// The 3D view: scene, camera, orbit controls, and turn animation.
//
// CubeView draws whatever cube state it is given and can animate one move
// at a time. It holds no game rules: the game controller owns the real cube
// state and decides which moves to play.
//
//   view.show(state)              draw a state immediately
//   await view.animate(move)      animate a move, then draw the resulting state
//   view.cancel()                 stop an animation in progress

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createSolvedState, applyMove, getMoveSpec } from '../core/cubeModel';
import { createCubies, resetCubieTransforms, paintCubies, type Cubie } from './cubeMeshes';
import type { Vec3 } from '../core/cubeModel';
import type { Axis, CubeState, Move, Palette } from '../core/types';

interface Animation {
    move: Move;
    pivot: THREE.Group;
    axis: Axis;
    targetAngle: number;
    angle: number;
    speed: () => number;
    resolve: (completed: boolean) => void;
}

const CANVAS_SCALE = 0.4; // canvas size as a fraction of the window
const ROTATION_SPEED = 0.1; // radians per frame at speed 1
const QUARTER_TURN = Math.PI / 2;
const CAMERA_RESET_SPEED = 0.04;
const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 3, 12);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

export class CubeView {
    private palette: Palette;
    private state: CubeState;
    private animation: Animation | null = null;
    private readonly onCameraResetComplete: () => void;
    private sizes: { width: number; height: number };
    private readonly scene: THREE.Scene;
    private readonly cubeRoot: THREE.Group;
    private readonly cubies: Cubie[];
    private readonly camera: THREE.PerspectiveCamera;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly controls: OrbitControls;
    private cameraResetting = false;
    private cameraResetAlpha = 0;

    /**
     * @param options.palette  Six hex colours, in FACE_ORDER.
     */
    constructor({ palette, onCameraResetComplete = () => {} }: { palette: Palette; onCameraResetComplete?: () => void }) {
        this.palette = palette;
        this.state = createSolvedState();
        this.onCameraResetComplete = onCameraResetComplete;

        this.sizes = this._windowSizes();

        this.scene = new THREE.Scene();
        this.scene.add(new THREE.AmbientLight(0xffffff, 1.0));

        this.cubeRoot = new THREE.Group();
        this.scene.add(this.cubeRoot);
        this.cubies = createCubies(this.cubeRoot);
        paintCubies(this.cubies, this.state, this.palette);

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
        this.controls.target.copy(DEFAULT_CAMERA_TARGET);
        this.controls.update();
    }

    mount(container: HTMLElement): void {
        container.appendChild(this.renderer.domElement);
    }

    start(): void {
        this.renderer.setAnimationLoop(() => this._renderFrame());
    }

    // ---- Cube ------------------------------------------------------------

    /** Draw `state` immediately, abandoning any animation in progress. */
    show(state: CubeState): void {
        this._finishAnimation(false);
        this.state = state;
        resetCubieTransforms(this.cubies, this.cubeRoot);
        paintCubies(this.cubies, this.state, this.palette);
    }

    /** Change the six face colours. */
    setPalette(palette: Palette): void {
        this.palette = palette;
        paintCubies(this.cubies, this.state, this.palette);
    }

    /**
     * Animate one move from the currently shown state, then show the result.
     * Resolves true when the move finished, or false if it was cancelled.
     * @param speed  Multiplier, or a function read every frame (so it can change mid-turn).
     */
    animate(move: Move, speed: number | (() => number) = 1): Promise<boolean> {
        this._finishAnimation(false);
        const { axis, direction, inLayer } = getMoveSpec(move);

        const pivot = new THREE.Group();
        this.cubeRoot.add(pivot);
        for (const cubie of this.cubies) {
            if (inLayer(cubie.userData.gridPos as Vec3)) pivot.add(cubie);
        }

        return new Promise<boolean>(resolve => {
            this.animation = {
                move,
                pivot,
                axis,
                targetAngle: direction * QUARTER_TURN,
                angle: 0,
                speed: typeof speed === 'function' ? speed : () => speed,
                resolve
            };
        });
    }

    /** Stop the current animation (its promise resolves false) and redraw the last state. */
    cancel(): void {
        this.show(this.state);
    }

    // ---- Camera / window ------------------------------------------------

    resetCamera(): void {
        this.cameraResetting = true;
        this.cameraResetAlpha = 0;
    }

    handleResize(): void {
        this.sizes = this._windowSizes();
        this.camera.aspect = this.sizes.width / this.sizes.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.sizes.width, this.sizes.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.controls.update();
    }

    // ---- Internals -------------------------------------------------------

    private _windowSizes() {
        return {
            width: window.innerWidth * CANVAS_SCALE,
            height: window.innerHeight * CANVAS_SCALE
        };
    }

    /** End the current animation, if any, resolving its promise with `completed`. */
    private _finishAnimation(completed: boolean): void {
        const animation = this.animation;
        if (!animation) return;
        this.animation = null;
        this.cubeRoot.remove(animation.pivot);
        resetCubieTransforms(this.cubies, this.cubeRoot);
        if (completed) {
            this.state = applyMove(this.state, animation.move);
        }
        paintCubies(this.cubies, this.state, this.palette);
        animation.resolve(completed);
    }

    private _stepAnimation(): void {
        const a = this.animation!;
        const step = ROTATION_SPEED * a.speed();
        a.angle = Math.min(a.angle + step, Math.abs(a.targetAngle));
        a.pivot.rotation[a.axis] = Math.sign(a.targetAngle) * a.angle;
        if (a.angle >= Math.abs(a.targetAngle)) this._finishAnimation(true);
    }

    private _stepCameraReset(): void {
        this.cameraResetAlpha += CAMERA_RESET_SPEED;
        if (this.cameraResetAlpha >= 1) {
            this.cameraResetAlpha = 1;
            this.cameraResetting = false;
            this.onCameraResetComplete();
        }
        this.camera.position.lerpVectors(this.camera.position.clone(), DEFAULT_CAMERA_POSITION, this.cameraResetAlpha);
        this.controls.target.lerp(DEFAULT_CAMERA_TARGET, this.cameraResetAlpha);
    }

    private _renderFrame(): void {
        if (this.animation) this._stepAnimation();
        if (this.cameraResetting) this._stepCameraReset();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
