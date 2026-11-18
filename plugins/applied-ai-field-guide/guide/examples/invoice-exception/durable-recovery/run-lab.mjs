import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { previousPendingState, recoverInFreshProcess, writePreviousState } from "./previous-release-fixture.mjs";

const root = await mkdtemp(path.join(tmpdir(), "applied-ai-durable-recovery-"));
const scenarios = [
  { name: "resume", effectCommitted: false, labOptions: {} },
  { name: "hold_changed_policy", effectCommitted: false, labOptions: { currentPolicyRevision: "policy-19" } },
  { name: "hold_unavailable_readback", effectCommitted: false, labOptions: { readbackAvailable: false } },
  { name: "reconcile", effectCommitted: true, labOptions: { currentPolicyRevision: "policy-19" } },
];

try {
  const results = [];
  for (const { name, effectCommitted, labOptions } of scenarios) {
    const workspace = path.join(root, name);
    await mkdir(workspace, { mode: 0o700 });
    await writePreviousState(workspace, previousPendingState({ effectCommitted }));
    const { result, effects } = await recoverInFreshProcess(workspace, { labOptions });
    results.push({ scenario: name, ...result, stored_effects: Object.keys(effects).length });
  }
  process.stdout.write(`${JSON.stringify({ input_state_format: "1.0.0", results }, null, 2)}\n`);
} finally {
  await rm(root, { recursive: true, force: true });
}
