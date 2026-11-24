// "Algorithm Viewer" panel: pick an algorithm and watch it play.

import { ALGORITHMS, getAlgorithmById, getAlgorithmCategories } from '../core/algorithms';

export function createAlgorithmPanel({ onWatch }, doc = document) {
    const select = doc.getElementById('algorithm-select');
    const desc = doc.getElementById('algorithm-desc');
    const watchBtn = doc.getElementById('watchAlgorithmBtn');

    function updateDescription() {
        if (!select || !desc) return;
        const alg = getAlgorithmById(select.value);
        desc.textContent = alg ? alg.description : '';
    }

    function populate() {
        if (!select) return;
        select.innerHTML = '';
        for (const cat of getAlgorithmCategories()) {
            const group = doc.createElement('optgroup');
            group.label = cat;
            for (const alg of ALGORITHMS.filter(a => a.category === cat)) {
                const opt = doc.createElement('option');
                opt.value = alg.id;
                opt.textContent = alg.name;
                group.appendChild(opt);
            }
            select.appendChild(group);
        }
        updateDescription();
    }

    populate();
    select.addEventListener('change', updateDescription);
    watchBtn.addEventListener('click', () => {
        if (select && select.value) onWatch(select.value);
    });

    return {
        setWatchEnabled(enabled) {
            if (watchBtn) watchBtn.disabled = !enabled;
        }
    };
}
