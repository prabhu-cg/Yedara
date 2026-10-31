import { defineConfig, devices } from "@playwright/test";

const APP_PORT = 3100;
const FAKE_SUPABASE_PORT = 54321;

/**
 * By default the suite runs against a local fake of the Supabase API backed
 * by real migrations + RLS (tests/support/fake-supabase.ts), so no cloud
 * project is required. To run against a real Supabase project instead, set
 * E2E_USE_REAL_SUPABASE=1 with NEXT_PUBLIC_SUPABASE_* configured (email
 * confirmation must be disabled for the test project).
 */
const useReal = process.env.E2E_USE_REAL_SUPABASE === "1";

const supabaseEnv: Record<string, string> = useReal
  ? {}
  : {
      NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${FAKE_SUPABASE_PORT}`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake-anon-key-for-local-e2e-0000000",
      NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${APP_PORT}`,
      // The suite signs up many users from one IP; raise the auth limiter.
      AUTH_RATE_LIMIT_MAX: "1000",
    };

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    {
      name: "tablet",
      use: { ...devices["Desktop Chrome"], viewport: { width: 820, height: 1180 }, hasTouch: true },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: [
    ...(useReal
      ? []
      : [
          {
            command: "npm run dev:fake-supabase",
            url: `http://127.0.0.1:${FAKE_SUPABASE_PORT}/__health`,
            env: { FAKE_SUPABASE_PORT: String(FAKE_SUPABASE_PORT) },
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
          },
        ]),
    {
      command: `npm run build && npx next start -p ${APP_PORT}`,
      url: `http://127.0.0.1:${APP_PORT}`,
      env: supabaseEnv,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
  ],
});
