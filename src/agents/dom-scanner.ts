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

// Single-page scan — works on ANY site, no config needed
export async function scanPageSelectors(url: string): Promise<string[]> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);
  const selectors = await extractSelectors(page);
  await browser.close();
  return [...new Set(selectors)];
}

// Multi-step scan — driven by config, works for ANY client app
export async function scanFlowSelectors(config: ScanConfig): Promise<string[]> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const allSelectors: string[] = [];

  await page.goto(config.startUrl);
  allSelectors.push(...(await extractSelectors(page)));

  for (const step of config.steps) {
    if (step.action === 'fill' && step.selector && step.value !== undefined) {
      await page.fill(step.selector, step.value);
    } else if (step.action === 'click' && step.selector) {
      await page.click(step.selector);
    } else if (step.action === 'waitForURL' && step.urlPattern) {
      await page.waitForURL(step.urlPattern);
    }
    allSelectors.push(...(await extractSelectors(page)));
  }

  await browser.close();
  return [...new Set(allSelectors)];
}