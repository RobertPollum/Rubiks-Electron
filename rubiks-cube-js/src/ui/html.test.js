import { describe, it, expect } from 'vitest';
import { escapeHtml } from './html';

describe('escapeHtml', () => {
    it('neutralises markup and attribute breakouts', () => {
        expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
        expect(escapeHtml(`" onmouseover='x'`)).toBe('&quot; onmouseover=&#39;x&#39;');
        expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
        expect(escapeHtml(42)).toBe('42');
    });
});
