import { ScanConfig } from '../dom-scanner';
import { saucedemoFlow } from './saucedemo-flow';

// To onboard a NEW client app:
// 1. Create a new file here, e.g. flows/acme-flow.ts, exporting a ScanConfig
//    (startUrl + steps) that describes THAT app's login/navigation sequence.
// 2. Import it below and add it to this registry with a short key name.
// 3. That's it — generator-test.ts, generator.ts, and the mandatory-prerequisite
//    login enforcement all work automatically off whatever config is selected here.
//    No other code changes needed per client app.
export const flowRegistry: Record<string, ScanConfig> = {
  saucedemo: saucedemoFlow,
  // acme: acmeFlow,
};

export function getFlowConfig(name: string): ScanConfig | undefined {
  return flowRegistry[name];
}