// End-to-end tests: drive the real web build in a browser.
//   npm run test:e2e
// First run on a new machine: npx playwright install chromium
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: 'tests/e2e',
    fullyParallel: true,
    reporter: 'list',
    use: {
        baseURL: 'http://127.0.0.1:4173/',
        viewport: { width: 1400, height: 900 },
        trace: 'off'
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 900 } } }],
    webServer: {
        command: 'npm run build:web && npm run preview:web -- --port 4173 --strictPort --host 127.0.0.1',
        url: 'http://127.0.0.1:4173/',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
    }
});
