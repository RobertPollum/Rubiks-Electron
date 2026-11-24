// Unit tests (npm test). Browser tests live in tests/e2e and run with Playwright.
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/*.test.ts']
    }
});
