// "Algorithm Viewer" panel: pick an algorithm and watch it play.

import { ALGORITHMS, getAlgorithmById, getAlgorithmCategories } from '../core/algorithms';

export function createAlgorithmPanel({ onWatch }: { onWatch: (algorithmId: string) => void }, doc: Document = document) {
    const select = doc.getElementById('algorithm-select') as HTMLSelectElement;
    const desc = doc.getElementById('algorithm-desc') as HTMLElement;
    const watchBtn = doc.getElementById('watchAlgorithmBtn') as HTMLButtonElement;

    function updateDescription(): void {
        desc.textContent = getAlgorithmById(select.value)?.description ?? '';
    }

    select.replaceChildren(...getAlgorithmCategories().map(category => {
        const group = doc.createElement('optgroup');
        group.label = category;
        for (const alg of ALGORITHMS.filter(a => a.category === category)) {
            const opt = doc.createElement('option');
            opt.value = alg.id;
            opt.textContent = alg.name;
            group.appendChild(opt);
        }
        return group;
    }));
    updateDescription();

    select.addEventListener('change', updateDescription);
    watchBtn.addEventListener('click', () => {
        if (select.value) onWatch(select.value);
    });

    return {
        setWatchEnabled(enabled: boolean): void {
            watchBtn.disabled = !enabled;
        }
    };
}
