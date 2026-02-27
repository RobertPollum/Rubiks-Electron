const STORAGE_KEY = 'rubiksCubeGameData';

const DEFAULT_DATA = {
    solves: [],
    currentGame: {
        moveHistory: [],
        cubeState: 'solved',
        cubies: null
    },
    stats: {
        totalSolves: 0,
        bestSolve: null,
        averageMoves: 0
    }
};

export function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            return { ...DEFAULT_DATA, ...data };
        }
    } catch (err) {
        console.error('Failed to load game data:', err);
    }
    return { ...DEFAULT_DATA };
}

export function saveData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
        console.error('Failed to save game data:', err);
    }
}

export function serializeCubies(ThreeDCubeArray) {
    const cubies = [];
    for (let z = 0; z < 3; z++) {
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 3; x++) {
                const cube = ThreeDCubeArray[z][y][x];
                if (cube) {
                    cubies.push({
                        index: { x, y, z },
                        position: {
                            x: cube.position.x,
                            y: cube.position.y,
                            z: cube.position.z
                        },
                        quaternion: {
                            x: cube.quaternion.x,
                            y: cube.quaternion.y,
                            z: cube.quaternion.z,
                            w: cube.quaternion.w
                        }
                    });
                }
            }
        }
    }
    return cubies;
}
