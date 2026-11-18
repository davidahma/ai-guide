import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const stateFile = "durable-recovery-state.json";
const requiredScope = "invoice-resolution:commit";

function clone(value) {
  return structuredClone(value);
}

function operationId(request) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify({
      tenant_id: request.tenant_id,
      business_operation_id: request.business_operation_id,
      invoice_id: request.invoice_id,
      action: "commit_invoice_resolution",
    }))
    .digest("hex")}`;
}

function recoveryError(code, message) {
  return Object.assign(new Error(message), { code });
}

function initialState() {
  return { schema_version: "1.0.0", operations: {}, effects: {}, audit: [] };
}

function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasSupportedShape(state) {
  return isRecord(state) && state.schema_version === "1.0.0" && isRecord(state.operations) && isRecord(state.effects) && Array.isArray(state.audit);
}

function validRequest(request) {
  return request
    && typeof request === "object"
    && typeof request.tenant_id === "string"
    && typeof request.business_operation_id === "string"
    && typeof request.invoice_id === "string"
    && typeof request.approval_revision === "string"
    && typeof request.policy_revision === "string"
    && request.caller
    && typeof request.caller.id === "string"
    && request.caller.tenant_id === request.tenant_id
    && Array.isArray(request.caller.scopes)
    && request.caller.scopes.includes(requiredScope);
}

/**
 * A deliberately small, fictional recovery world. It persists operation intent
 * before a simulated external effect, then treats readback—not an interrupted
 * process's memory—as the only completion proof. It is not a concurrency-safe
 * workflow engine or a production storage design.
 */
export async function createDurableRecoveryLab(root, {
  currentPolicyRevision = "policy-18",
  currentApprovalRevision = "approval-42",
  readbackAvailable = true,
} = {}) {
  if (typeof root !== "string" || !path.isAbsolute(root)) throw new Error("root must be an absolute path");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const file = path.join(root, stateFile);
  let state;
  try {
    state = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    state = initialState();
    await persist();
  }
  if (!hasSupportedShape(state)) {
    throw new Error("durable-recovery state is malformed");
  }

  async function persist() {
    const temporary = path.join(root, `.${stateFile}.${process.pid}.${Date.now()}.tmp`);
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await rename(temporary, file);
  }

  function record(action, details = {}) {
    state.audit.push({ sequence: state.audit.length + 1, action, ...clone(details) });
  }

  async function deny(request, reason) {
    record("request_denied", { tenant_id: request?.tenant_id ?? null, reason });
    await persist();
    return { status: "denied", reason, effect: null };
  }

  function requestIsCurrent(request) {
    return request.policy_revision === currentPolicyRevision && request.approval_revision === currentApprovalRevision;
  }

  function matchesOperation(operation, request, id) {
    return operation.operation_id === id && operation.tenant_id === request.tenant_id && operation.invoice_id === request.invoice_id;
  }

  function receiptFor(id, effect) {
    return { operation_id: id, effect_id: effect.effect_id, invoice_id: effect.invoice_id, tenant_id: effect.tenant_id, verified_by: "simulated_source_of_truth_readback" };
  }

  async function readRecordedEffect(id, operation) {
    if (!readbackAvailable) return { status: "unavailable" };
    const stored = JSON.parse(await readFile(file, "utf8"));
    if (!hasSupportedShape(stored)) throw new Error("durable-recovery readback state is malformed");
    if (!Object.hasOwn(stored.effects, id)) return { status: "absent" };
    const effect = stored.effects[id];
    if (!isRecord(effect) || effect.tenant_id !== operation.tenant_id || effect.invoice_id !== operation.invoice_id
      || effect.idempotency_key !== id || effect.status !== "committed" || typeof effect.effect_id !== "string" || !effect.effect_id) {
      return { status: "mismatch" };
    }
    return { status: "committed", effect };
  }

  function hold(disposition, effectCreated = false) {
    return { status: "reconciliation_pending", disposition, receipt: null, effect_created: effectCreated };
  }

  async function readbackHold(id, disposition, effectCreated = false) {
    record(disposition, { operation_id: id });
    await persist();
    return hold(disposition, effectCreated);
  }

  async function createEffect(id, request, { fault = null, resumed = false } = {}) {
    state.effects[id] = {
      effect_id: `effect-${id.slice(-12)}`,
      tenant_id: request.tenant_id,
      invoice_id: request.invoice_id,
      idempotency_key: id,
      status: "committed",
    };
    record("external_effect_created", { operation_id: id, effect_id: state.effects[id].effect_id });
    await persist();
    if (fault === "after_effect_before_receipt") throw recoveryError("SIMULATED_AMBIGUOUS_EFFECT", "external effect may have completed; do not retry before readback");
    const readback = await readRecordedEffect(id, state.operations[id]);
    if (readback.status === "unavailable") return readbackHold(id, "readback_unavailable_escalate", true);
    if (readback.status !== "committed") return readbackHold(id, "readback_did_not_match_operation", true);

    state.operations[id].status = "completed";
    state.operations[id].completion_reason = resumed ? "resumed_after_verified_absence" : "same_process_readback";
    record("effect_read_back", { operation_id: id });
    await persist();
    return { status: "completed", disposition: resumed ? "resumed_after_verified_absence" : "verified_effect", receipt: receiptFor(id, readback.effect), effect_created: true };
  }

  async function submit(request, { fault = null } = {}) {
    if (!validRequest(request)) return deny(request, "caller_or_request_is_not_authorized");
    if (!requestIsCurrent(request)) return deny(request, "approval_or_policy_is_not_current");
    if (!new Set([null, "before_effect", "after_effect_before_receipt"]).has(fault)) throw new Error("fault must be before_effect, after_effect_before_receipt, or null");
    const id = operationId(request);
    const existing = state.operations[id];
    if (existing?.status === "completed") {
      record("duplicate_delivery_replayed", { operation_id: id });
      await persist();
      return recover(request);
    }
    if (existing?.status === "pending_effect") {
      record("duplicate_delivery_requires_reconciliation", { operation_id: id });
      await persist();
      return hold("do_not_blindly_retry");
    }
    if (Object.hasOwn(state.operations, id) || Object.hasOwn(state.effects, id)) return hold("recorded_state_requires_reconciliation");

    state.operations[id] = {
      operation_id: id,
      status: "pending_effect",
      tenant_id: request.tenant_id,
      invoice_id: request.invoice_id,
      policy_revision: request.policy_revision,
      approval_revision: request.approval_revision,
    };
    record("effect_intent_persisted", { operation_id: id });
    await persist();
    if (fault === "before_effect") throw recoveryError("SIMULATED_INTERRUPTION_BEFORE_EFFECT", "interrupted after intent persisted and before external effect");

    return createEffect(id, request, { fault });
  }

  async function recover(request, { resumeAbsentEffect = false } = {}) {
    if (!validRequest(request)) return deny(request, "caller_or_request_is_not_authorized");
    const id = operationId(request);
    const operation = state.operations[id];
    if (!Object.hasOwn(state.operations, id)) {
      if (Object.hasOwn(state.effects, id)) return readbackHold(id, "effect_without_recorded_intent");
      return { status: "not_found", disposition: "no_recorded_operation", receipt: null, effect_created: false };
    }
    if (!isRecord(operation) || !matchesOperation(operation, request, id) || !["pending_effect", "completed", "escalated"].includes(operation.status)) {
      return readbackHold(id, "recorded_state_requires_reconciliation");
    }
    const readback = await readRecordedEffect(id, operation);
    if (readback.status === "unavailable") return readbackHold(id, "readback_unavailable_escalate");
    if (readback.status === "mismatch") return readbackHold(id, "readback_did_not_match_operation");
    if (readback.status === "committed") {
      const { effect } = readback;
      if (operation.status === "completed") return { status: "completed", disposition: "existing_verified_effect", receipt: receiptFor(id, effect), effect_created: false };
      operation.status = "completed";
      operation.completion_reason = "recovered_source_of_truth_readback";
      record("effect_reconciled_after_restart", { operation_id: id, effect_id: effect.effect_id });
      await persist();
      return { status: "completed", disposition: "reconciled_existing_effect", receipt: receiptFor(id, effect), effect_created: false };
    }
    if (operation.status === "completed") return readbackHold(id, "completed_effect_missing_from_readback");
    if (operation.status === "escalated") return { status: "escalated", disposition: operation.escalation_reason, receipt: null, effect_created: false };

    const approvalIsUnchanged = requestIsCurrent(request)
      && operation.policy_revision === request.policy_revision
      && operation.approval_revision === request.approval_revision;
    if (approvalIsUnchanged && resumeAbsentEffect === true) return createEffect(id, request, { resumed: true });

    operation.status = "escalated";
    operation.escalation_reason = approvalIsUnchanged ? "no_effect_readback_requires_operator_decision" : "approval_or_policy_changed_before_effect";
    record("pending_operation_escalated", { operation_id: id, reason: operation.escalation_reason });
    await persist();
    return { status: "escalated", disposition: operation.escalation_reason, receipt: null, effect_created: false };
  }

  return Object.freeze({
    submit,
    recover,
    inspect: () => clone(state),
    statePath: file,
    operationId,
  });
}
