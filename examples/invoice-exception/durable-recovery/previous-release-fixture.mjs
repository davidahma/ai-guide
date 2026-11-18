import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const previousReleaseRequest = Object.freeze({
  tenant_id: "tenant-a",
  business_operation_id: "resolve-inv-100-legacy",
  invoice_id: "inv-100",
  approval_revision: "approval-42",
  policy_revision: "policy-18",
  caller: Object.freeze({ id: "reviewer-17", tenant_id: "tenant-a", scopes: Object.freeze(["invoice-resolution:commit"]) }),
});

// Captured from the previous writer at its two interruption points. Freeze the
// wire shape and IDs rather than generating compatibility fixtures with the new code.
export const previousReleaseOperationId = "sha256:765d89b96ba07b9a7df2b4d939d57e1bde0a36674de6d13f00952fe73dc60a68";

export function previousPendingState({ effectCommitted = false } = {}) {
  const id = previousReleaseOperationId;
  const effectId = "effect-2fe73dc60a68";
  return {
    schema_version: "1.0.0",
    operations: {
      [id]: { operation_id: id, status: "pending_effect", tenant_id: "tenant-a", invoice_id: "inv-100", policy_revision: "policy-18", approval_revision: "approval-42" },
    },
    effects: effectCommitted ? {
      [id]: { effect_id: effectId, tenant_id: "tenant-a", invoice_id: "inv-100", idempotency_key: id, status: "committed" },
    } : {},
    audit: [
      { sequence: 1, action: "effect_intent_persisted", operation_id: id },
      ...(effectCommitted ? [{ sequence: 2, action: "external_effect_created", operation_id: id, effect_id: effectId }] : []),
    ],
  };
}

export async function writePreviousState(root, state) {
  await writeFile(path.join(root, "durable-recovery-state.json"), `${JSON.stringify(state, null, 2)}\n`, { flag: "wx", mode: 0o600 });
}

export async function recoverInFreshProcess(root, { request = previousReleaseRequest, labOptions = {}, resumeAbsentEffect = true } = {}) {
  const moduleUrl = JSON.stringify(new URL("./durable-recovery.mjs", import.meta.url).href);
  const worker = `
    import { createDurableRecoveryLab } from ${moduleUrl};
    const [root, config] = process.argv.slice(1);
    const { request, labOptions, resumeAbsentEffect } = JSON.parse(config);
    const lab = await createDurableRecoveryLab(root, labOptions);
    const result = await lab.recover(request, { resumeAbsentEffect });
    const { operations, effects, audit } = lab.inspect();
    process.stdout.write(JSON.stringify({ worker_pid: process.pid, result, operations, effects, audit }));
  `;
  const { stdout } = await execFileAsync(process.execPath, ["--input-type=module", "--eval", worker, "--", root, JSON.stringify({ request, labOptions, resumeAbsentEffect })], { timeout: 10_000 });
  return JSON.parse(stdout);
}
