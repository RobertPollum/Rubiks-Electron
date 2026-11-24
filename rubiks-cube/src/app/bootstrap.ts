// Composition root: builds every piece and wires them together.
// Platform-specific services come in through `platform`, so this same code
// runs in the Electron renderer and in a plain browser.

import { mergeWithDefaults } from '../core/gameData';
import { createSettingsStore } from './settingsStore';
import { createGameController } from './gameController';
import { CubeView } from '../view/cubeView';
import { createStatusBar } from '../ui/statusBar';
import { createSidebar } from '../ui/sidebar';
import { createAlgorithmPanel } from '../ui/algorithmPanel';
import { createSettingsModal } from '../ui/settingsModal';
import { bindKeyboard } from '../ui/keyboard';
import type { Platform } from '../platform';

export async function bootstrap(platform: Platform, doc: Document = document) {
    const gameData = mergeWithDefaults(await platform.storage.load());
    const save = () => platform.storage.save(gameData);

    const settings = createSettingsStore(gameData, save);
    const status = createStatusBar(doc.getElementById('info'));
    const sidebar = createSidebar(doc);
    const game = createGameController({ gameData, save, settings, sidebar, status });

    const view = new CubeView({
        palette: settings.getActiveColors(),
        onCameraResetComplete: () => status.ready()
    });
    game.attachView(view);

    const settingsModal = createSettingsModal({
        settings,
        onColorsChanged: colors => view.setPalette(colors),
        onCubeSizeChanged: size => game.setCubeSize(size),
        hasProgress: game.hasProgress,
        files: platform.files
    }, doc);

    status.setPlain(platform.describe());

    view.mount(doc.getElementById('main-content')!);
    view.start();
    window.addEventListener('resize', () => view.handleResize());

    sidebar.bindActions({
        onScramble: game.scramble,
        onReset: game.reset,
        onReplay: game.replay,
        onOpenSettings: settingsModal.open
    });
    createAlgorithmPanel({ onWatch: game.runAlgorithm }, doc);
    bindKeyboard({
        isSettingsOpen: settingsModal.isOpen,
        closeSettings: settingsModal.close,
        isInputLocked: game.isInputLocked,
        turn: game.turn,
        onLayerSelected: layer => {
            if (layer === null) status.ready();
            else status.show(`Layer ${layer}: now press a face key (R, L, U, D, F, B)`, 'info');
        },
        resetCamera: game.resetCamera
    }, doc);

    game.renderHistory();
    game.resumeSavedGame();

    return { game, view, settings };
}
