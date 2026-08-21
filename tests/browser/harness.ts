/**
 * Browser-test harness: launches Chromium with the built unpacked extension
 * and serves authored fixtures under real `https://github.com/...` URLs via
 * route interception. The extension therefore runs with its shipping match
 * pattern against deterministic local content — no network, no GitHub
 * dependency, no test-only manifest.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type BrowserContext, type Page } from 'playwright';

import { commitFixtureHtml, fixtureUrl, type CommitFixture } from './fixture-page.ts';

export interface Harness {
  readonly context: BrowserContext;
  readonly extensionId: string;
  /** Requests that escaped the fixture routing — must stay empty. */
  readonly externalRequests: string[];
  serve(fixtures: readonly CommitFixture[]): Promise<void>;
  /** Serve arbitrary pre-rendered pages under exact URLs (reference fixtures). */
  serveRaw(pages: ReadonlyMap<string, string>): Promise<void>;
  openCommitPage(fixture: CommitFixture): Promise<Page>;
  openOptionsPage(): Promise<Page>;
  close(): Promise<void>;
}

/**
 * Discover the loaded extension's ID from chrome://extensions. Computing it
 * from the path hash is platform-fragile (Windows hashes the UTF-16 path);
 * reading the WebUI is ground truth.
 */
async function discoverExtensionId(context: BrowserContext): Promise<string> {
  const page = await context.newPage();
  try {
    await page.goto('chrome://extensions/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const manager = document.querySelector('extensions-manager');
      const list = manager?.shadowRoot?.querySelector('extensions-item-list');
      return (list?.shadowRoot?.querySelectorAll('extensions-item').length ?? 0) > 0;
    });
    const id = await page.evaluate(() => {
      const manager = document.querySelector('extensions-manager');
      const list = manager?.shadowRoot?.querySelector('extensions-item-list');
      return list?.shadowRoot?.querySelector('extensions-item')?.getAttribute('id') ?? null;
    });
    if (id === null) throw new Error('no extension loaded');
    return id;
  } finally {
    await page.close();
  }
}

export async function launchHarness(profileDir: string): Promise<Harness> {
  // TL_EXT_DIR lets the packaged smoke load the extracted ZIP bytes instead
  // of dist/ — same harness, same assertions, shipped bytes.
  const dist = process.env['TL_EXT_DIR'] ?? join(process.cwd(), 'dist');
  if (!existsSync(join(dist, 'manifest.json'))) {
    throw new Error(`${dist} has no manifest.json — run the build (or package) step first`);
  }

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://github.com' });

  const externalRequests: string[] = [];
  const routes = new Map<string, string>();

  // Only http(s) is intercepted; chrome-extension:// and internal schemes
  // stay untouched so extension pages load normally.
  await context.route(/^https?:\/\//, async (route) => {
    const url = route.request().url();
    const fixture = routes.get(url.split('#')[0] as string);
    if (fixture !== undefined) {
      await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fixture });
      return;
    }
    // Anything else would be a network request; record and refuse it.
    externalRequests.push(url);
    await route.abort();
  });

  const extensionId = await discoverExtensionId(context);

  return {
    context,
    extensionId,
    externalRequests,
    serve(fixtures: readonly CommitFixture[]): Promise<void> {
      for (const fixture of fixtures) {
        routes.set(fixtureUrl(fixture), commitFixtureHtml(fixture));
      }
      return Promise.resolve();
    },
    serveRaw(pages: ReadonlyMap<string, string>): Promise<void> {
      for (const [url, html] of pages) routes.set(url, html);
      return Promise.resolve();
    },
    async openCommitPage(fixture: CommitFixture): Promise<Page> {
      const page = await context.newPage();
      await page.goto(fixtureUrl(fixture), { waitUntil: 'domcontentloaded' });
      return page;
    },
    async openOptionsPage(): Promise<Page> {
      // Direct navigation to a chrome-extension page occasionally reports
      // ERR_BLOCKED_BY_CLIENT in automation even though the page is fine;
      // a bounded retry absorbs the flake (the product never performs this
      // navigation itself — users reach options through Chrome's UI).
      const url = `chrome-extension://${extensionId}/options.html`;
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        const page = await context.newPage();
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded' });
          return page;
        } catch (error) {
          lastError = error;
          await page.close();
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }
      throw lastError;
    },
    async close(): Promise<void> {
      await context.close();
    },
  };
}

export const OWNED_ROOT = '[data-trailer-lens="root"]';
