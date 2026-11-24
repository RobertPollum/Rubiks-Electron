// Moving files in and out of the app (theme import/export).
// Browser implementation; Electron could later swap in native save/open
// dialogs through IPC without the settings UI changing.

/** Offer `data` to the user as a downloadable JSON file. */
export function downloadJson(filename: string, data: unknown): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Let the user pick a text file. Resolves with its contents; never resolves
 * if the picker is cancelled (matching the browser's behaviour).
 */
export function pickTextFile(accept = '.json'): Promise<string> {
    return new Promise<string>(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.addEventListener('change', () => {
            const file = input.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.readAsText(file);
        });
        input.click();
    });
}
