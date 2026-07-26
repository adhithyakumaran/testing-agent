import { chromium, Page } from '@playwright/test';

export interface FlowStep {
  action: 'fill' | 'click' | 'waitForURL';
  selector?: string;      // for fill/click
  value?: string;         // for fill
  urlPattern?: RegExp;    // for waitForURL
}

export interface ScanConfig {
  startUrl: string;
  steps: FlowStep[];
  // Optional alternate paths to scan AFTER the main `steps` sequence completes.
  // Each branch is replayed from a FRESH page (main steps replayed first, then
  // the branch's own steps), so branches never interfere with each other or
  // with the main happy-path scan. Use this to capture states the main path
  // never reaches — e.g. validation/error messages after an invalid submission.
  // Example: branches: [[
  //   { action: 'fill', selector: '[data-test="firstName"]', value: '' },
  //   { action: 'fill', selector: '[data-test="lastName"]', value: 'Test' },
  //   { action: 'click', selector: '[data-test="continue"]' },
  // ]]
  branches?: FlowStep[][];
}

async function extractSelectors(page: Page): Promise<string[]> {
  const selectors = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('[data-test]'));
    return elements.map((el) => {
      const tag = el.tagName.toLowerCase();
      const dataTest = el.getAttribute('data-test');
      const text = el.textContent?.trim().slice(0, 30) || '';
      return `${tag}[data-test="${dataTest}"] — text: "${text}"`;
    });
  });
  return selectors;
}

async function runStepsCapturing(page: Page, steps: FlowStep[], allSelectors: string[]): Promise<void> {
  for (const step of steps) {
    if (step.action === 'fill' && step.selector && step.value !== undefined) {
      await page.fill(step.selector, step.value);
    } else if (step.action === 'click' && step.selector) {
      await page.click(step.selector);
    } else if (step.action === 'waitForURL' && step.urlPattern) {
      await page.waitForURL(step.urlPattern);
    }
    // Capture after EVERY step, not just at the end — intermediate pages
    // (post-login, post-add-to-cart, post-cart-click, etc.) each have their
    // own elements that would otherwise never be seen.
    allSelectors.push(...(await extractSelectors(page)));
  }
}

// Single-page scan — works on ANY site, no config needed
export async function scanPageSelectors(url: string): Promise<string[]> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);
  const selectors = await extractSelectors(page);
  await browser.close();
  return [...new Set(selectors)];
}

// Multi-step scan — driven by config, works for ANY client app.
// Scans the main happy-path `steps`, then (if provided) each `branches` entry,
// so error/validation-only selectors get genuinely grounded too, not guessed.
export async function scanFlowSelectors(config: ScanConfig): Promise<string[]> {
  const browser = await chromium.launch();
  const allSelectors: string[] = [];

  // Main happy-path scan — captures after every step, including the initial page load
  const mainPage = await browser.newPage();
  await mainPage.goto(config.startUrl);
  allSelectors.push(...(await extractSelectors(mainPage)));
  await runStepsCapturing(mainPage, config.steps, allSelectors);
  await mainPage.close();

  // Branch scans (e.g. error/validation states) — each replayed fresh so they
  // don't interfere with the main path or with each other. Also captures after
  // every step, both while replaying the main path and while applying the
  // branch's own steps.
  if (config.branches) {
    for (const branchSteps of config.branches) {
      const branchPage = await browser.newPage();
      await branchPage.goto(config.startUrl);
      allSelectors.push(...(await extractSelectors(branchPage)));
      await runStepsCapturing(branchPage, config.steps, allSelectors);     // replay main path to reach the branch point
      await runStepsCapturing(branchPage, branchSteps, allSelectors);       // then apply the branch's own steps
      await branchPage.close();
    }
  }

  await browser.close();
  return [...new Set(allSelectors)];
}