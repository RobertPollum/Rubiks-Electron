import { describe, it, expect, vi } from 'vitest';
import { createElectronFileAdapter } from './electronFileAdapter';
import type { StorageAdapter } from './types';
import { createDefaultData } from '../core/gameData';

const legacyWith = (data: unknown): StorageAdapter => ({ name: 'legacy', load: async () => data, save: vi.fn() });

describe('Electron file storage adapter', () => {
    it('loads from the file when it exists', async () => {
        const fileData = { solves: [1] };
        const adapter = createElectronFileAdapter({ load: async () => fileData, save: vi.fn() }, legacyWith({ solves: [2] }));
        expect(await adapter.load()).toBe(fileData);
    });

    it('falls back to old localStorage data when there is no file yet', async () => {
        const old = { solves: [2] };
        const adapter = createElectronFileAdapter({ load: async () => null, save: vi.fn() }, legacyWith(old));
        expect(await adapter.load()).toBe(old);
    });

    it('falls back if the file cannot be read', async () => {
        const old = { solves: [3] };
        const adapter = createElectronFileAdapter({ load: () => Promise.reject(new Error('boom')), save: vi.fn() }, legacyWith(old));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(await adapter.load()).toBe(old);
    });

    it('saves through the bridge and never throws', async () => {
        const save = vi.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValue(undefined);
        const adapter = createElectronFileAdapter({ load: async () => null, save }, legacyWith(null));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const data = createDefaultData();
        await expect(adapter.save(data)).resolves.toBeUndefined();
        await adapter.save(data);
        expect(save).toHaveBeenCalledTimes(2);
        expect(save).toHaveBeenLastCalledWith(data);
    });
});
