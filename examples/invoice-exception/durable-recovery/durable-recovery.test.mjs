import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createDurableRecoveryLab } from "./durable-recovery.mjs";
import { previousPendingState, previousReleaseOperationId, previousReleaseRequest, recoverInFreshProcess, writePreviousState } from "./previous-release-fixture.mjs";

const request = Object.freeze({
  tenant_id: "tenant-a",
  business_operation_id: "resolve-inv-100-exception",
  invoice_id: "inv-100",
  approval_revision: "approval-42",
  policy_revision: "policy-18",
  caller: Object.freeze({ id: "reviewer-17", tenant_id: "tenant-a", scopes: Object.freeze(["invoice-resolution:commit"]) }),
});

async function temporaryRoot(t) {
  const root = await mkdtemp(path.join(tmpdir(), "applied-ai-durable-recovery-test-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  return root;
}

async function world(t, options = {}) {
  const root = await temporaryRoot(t);
  return { root, lab: await createDurableRecoveryLab(root, options) };
}

test("an ambiguous effect survives restart and is reconciled without a second effect", async (t) => {
  const { root, lab } = await world(t);
  await assert.rejects(lab.submit(request, { fault: "after_effect_before_receipt" }), { code: "SIMULATED_AMBIGUOUS_EFFECT" });
  assert.equal(Object.keys(lab.inspect().effects).length, 1);
  assert.equal(Object.values(lab.inspect().operations)[0].status, "pending_effect");

  const restarted = await createDurableRecoveryLab(root);
  const recovered = await restarted.recover(request);
  assert.deepEqual(recovered, {
    status: "completed",
    disposition: "reconciled_existing_effect",
    receipt: {
      operation_id: restarted.operationId(request),
      effect_id: `effect-${restarted.operationId(request).slice(-12)}`,
      invoice_id: "inv-100",
      tenant_id: "tenant-a",
      verified_by: "simulated_source_of_truth_readback",
    },
    effect_created: false,
  });
  assert.equal(Object.keys(restarted.inspect().effects).length, 1);
  const duplicate = await restarted.submit(request);
  assert.equal(duplicate.disposition, "existing_verified_effect");
  assert.equal(Object.keys(restarted.inspect().effects).length, 1);
});

test("a pre-effect interruption never retries after policy changes", async (t) => {
  const { root, lab } = await world(t);
  await assert.rejects(lab.submit(request, { fault: "before_effect" }), { code: "SIMULATED_INTERRUPTION_BEFORE_EFFECT" });
  assert.equal(Object.keys(lab.inspect().effects).length, 0);

  const changedPolicy = await createDurableRecoveryLab(root, { currentPolicyRevision: "policy-19" });
  const recovered = await changedPolicy.recover(request);
  assert.equal(recovered.status, "escalated");
  assert.equal(recovered.disposition, "approval_or_policy_changed_before_effect");
  assert.equal(Object.keys(changedPolicy.inspect().effects).length, 0);
});

test("failed readback keeps the operation pending and blocks a blind retry", async (t) => {
  const { root, lab } = await world(t);
  await assert.rejects(lab.submit(request, { fault: "after_effect_before_receipt" }), { code: "SIMULATED_AMBIGUOUS_EFFECT" });
  const unavailable = await createDurableRecoveryLab(root, { readbackAvailable: false });
  const recovered = await unavailable.recover(request);
  assert.equal(recovered.disposition, "readback_unavailable_escalate");
  const duplicate = await unavailable.submit(request);
  assert.equal(duplicate.disposition, "do_not_blindly_retry");
  assert.equal(Object.keys(unavailable.inspect().effects).length, 1);
});

test("a committed first attempt with unavailable readback is recorded as written but unverified", async (t) => {
  const { root, lab } = await world(t, { readbackAvailable: false });
  const id = lab.operationId(request);
  const first = await lab.submit(request);
  assert.deepEqual(first, {
    status: "reconciliation_pending",
    disposition: "readback_unavailable_escalate",
    receipt: null,
    effect_created: true,
  });
  assert.equal(lab.inspect().operations[id].status, "pending_effect");
  assert.equal((await lab.submit(request)).effect_created, false);

  const { result, effects, audit } = await recoverInFreshProcess(root, { request });
  assert.equal(result.disposition, "reconciled_existing_effect");
  assert.equal(result.effect_created, false);
  assert.deepEqual(Object.keys(effects), [id]);
  assert.equal(result.receipt.effect_id, effects[id].effect_id);
  assert.equal(audit.filter(({ action }) => action === "external_effect_created").length, 1);
});

test("cross-tenant or scope-invalid requests cannot create an effect", async (t) => {
  const { lab } = await world(t);
  const crossTenant = await lab.submit({ ...request, tenant_id: "tenant-b", caller: { ...request.caller, tenant_id: "tenant-a" } });
  assert.equal(crossTenant.status, "denied");
  const missingScope = await lab.submit({ ...request, caller: { ...request.caller, scopes: [] } });
  assert.equal(missingScope.status, "denied");
  assert.equal(Object.keys(lab.inspect().effects).length, 0);
});

test("a fresh worker resumes previous-release intent on verified absence without changing its key", async (t) => {
  const root = await temporaryRoot(t);
  await writePreviousState(root, previousPendingState());

  const { worker_pid, result, operations, effects, audit } = await recoverInFreshProcess(root);
  assert.notEqual(worker_pid, process.pid);
  assert.equal(result.disposition, "resumed_after_verified_absence");
  assert.equal(result.effect_created, true);
  assert.equal(result.receipt.operation_id, previousReleaseOperationId);
  assert.equal(operations[previousReleaseOperationId].status, "completed");
  assert.deepEqual(Object.keys(effects), [previousReleaseOperationId]);
  assert.equal(audit.filter(({ action }) => action === "external_effect_created").length, 1);

  const replay = await recoverInFreshProcess(root);
  assert.equal(replay.result.disposition, "existing_verified_effect");
  assert.equal(replay.result.effect_created, false);
  assert.deepEqual(replay.effects, effects);
  assert.deepEqual(replay.audit, audit);
});

test("a fresh worker holds previous-release intent when policy changed, even with updated input", async (t) => {
  const root = await temporaryRoot(t);
  const candidateRequest = { ...previousReleaseRequest, policy_revision: "policy-19" };
  const labOptions = { currentPolicyRevision: "policy-19" };
  await writePreviousState(root, previousPendingState());

  const { result, effects } = await recoverInFreshProcess(root, { request: candidateRequest, labOptions });
  assert.equal(result.status, "escalated");
  assert.equal(result.disposition, "approval_or_policy_changed_before_effect");
  assert.deepEqual(effects, {});

  const lab = await createDurableRecoveryLab(root, labOptions);
  const duplicate = await lab.submit(candidateRequest);
  assert.equal(duplicate.disposition, "recorded_state_requires_reconciliation");
  assert.deepEqual(lab.inspect().effects, {});
});

test("a fresh worker does not interpret unavailable readback as absence", async (t) => {
  const root = await temporaryRoot(t);
  await writePreviousState(root, previousPendingState());

  const { result, operations, effects } = await recoverInFreshProcess(root, { labOptions: { readbackAvailable: false } });
  assert.equal(result.disposition, "readback_unavailable_escalate");
  assert.equal(operations[previousReleaseOperationId].status, "pending_effect");
  assert.deepEqual(effects, {});
});

test("a fresh worker reconciles an earlier effect without reusing its old approval", async (t) => {
  const root = await temporaryRoot(t);
  const legacy = previousPendingState({ effectCommitted: true });
  await writePreviousState(root, legacy);

  const { result, operations, effects, audit } = await recoverInFreshProcess(root, { labOptions: { currentApprovalRevision: "approval-43" } });
  assert.equal(result.disposition, "reconciled_existing_effect");
  assert.equal(result.effect_created, false);
  assert.equal(result.receipt.effect_id, legacy.effects[previousReleaseOperationId].effect_id);
  assert.equal(operations[previousReleaseOperationId].status, "completed");
  assert.deepEqual(effects, legacy.effects);
  assert.equal(audit.filter(({ action }) => action === "external_effect_created").length, 1);
});

test("verified absence still requires a resume decision", async (t) => {
  const root = await temporaryRoot(t);
  await writePreviousState(root, previousPendingState());

  const { result, effects } = await recoverInFreshProcess(root, { resumeAbsentEffect: false });
  assert.equal(result.disposition, "no_effect_readback_requires_operator_decision");
  assert.deepEqual(effects, {});
});

test("a mismatched receipt neither completes an operation nor permits another write", async (t) => {
  const root = await temporaryRoot(t);
  const legacy = previousPendingState({ effectCommitted: true });
  legacy.effects[previousReleaseOperationId].invoice_id = "inv-200";
  await writePreviousState(root, legacy);

  const { result, operations, effects } = await recoverInFreshProcess(root);
  assert.equal(result.disposition, "readback_did_not_match_operation");
  assert.equal(result.receipt, null);
  assert.equal(result.effect_created, false);
  assert.equal(operations[previousReleaseOperationId].status, "pending_effect");
  assert.deepEqual(effects, legacy.effects);
});

test("unknown state formats are refused without rewriting state", async (t) => {
  const root = await temporaryRoot(t);
  await writePreviousState(root, { ...previousPendingState(), schema_version: "2.0.0" });
  const file = path.join(root, "durable-recovery-state.json");
  const original = await readFile(file, "utf8");

  await assert.rejects(recoverInFreshProcess(root), /durable-recovery state is malformed/);
  assert.equal(await readFile(file, "utf8"), original);
});
