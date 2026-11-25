import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { reportCaseOutcomes } from "../examples/invoice-exception/case-outcomes.mjs";
import { baseInput, createInvoiceWorld } from "../examples/invoice-exception/invoice-world-fixture.mjs";
import { runInvoiceException } from "../examples/invoice-exception/reference-loop.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function validator(schemaName) {
  const schema = JSON.parse(await readFile(path.join(root, "schemas", schemaName), "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

async function completedRun() {
  const world = createInvoiceWorld();
  const result = await runInvoiceException(structuredClone(baseInput), world.deps);
  return result;
}

test("reference traces and effect receipts satisfy the closed telemetry contracts", async () => {
  const [validateTrace, validateReceipt, result] = await Promise.all([
    validator("trace-event.schema.json"),
    validator("effect-receipt.schema.json"),
    completedRun(),
  ]);

  for (const event of result.trace) {
    assert.equal(validateTrace(event), true, JSON.stringify(validateTrace.errors));
  }
  assert.equal(validateReceipt(result.effect_receipt), true, JSON.stringify(validateReceipt.errors));
});

test("accepted-outcome telemetry is verifier-derived rather than a terminal-state assertion", async () => {
  const [contract, result] = await Promise.all([
    readFile(path.join(root, "operations", "telemetry-contract.md"), "utf8"),
    completedRun(),
  ]);
  assert.match(contract, /MUST be true only after confirmation by the workflow charter's declared independent verifier/i);
  assert.match(contract, /terminal workflow state or model assertion is insufficient/i);
  assert.match(contract, /accepted_outcome_rate = verifier_confirmed_accepted_cases_as_of_cutoff \/ eligible_cases/);
  const terminalEvent = result.trace.at(-1);
  assert.equal(terminalEvent.telemetry["agent.accepted_outcome"], true);
  assert.equal(result.effect_receipt.readback.status, "matched");
  assert.equal(result.effect_receipt.readback.verifier, "invoice-postcondition-verifier");
});

test("trace details reject credentials, raw prompts, PII, and unrestricted retrieved content", async () => {
  const validateTrace = await validator("trace-event.schema.json");
  const result = await completedRun();

  for (const [field, value] of [
    ["authorization_token", "Bearer secret"],
    ["raw_prompt", "hidden system prompt"],
    ["customer_email", "person@example.com"],
    ["retrieved_content", "unrestricted document body"],
    ["invoice_revision", "7"],
  ]) {
    const event = structuredClone(result.trace[0]);
    event.details[field] = value;
    assert.equal(validateTrace(event), false, `${field} unexpectedly passed`);
    assert.ok(validateTrace.errors.some((error) => error.keyword === "additionalProperties"));
  }
});

test("state details use workflow-neutral hashed and typed references", async () => {
  const validateTrace = await validator("trace-event.schema.json");
  const result = await completedRun();
  const event = structuredClone(result.trace[0]);
  event.state = "evidence_reconciled";
  event.telemetry["agent.workflow.state"] = event.state;
  event.details = {
    source_revisions: [{ source_id: "case_record", revision_digest: `sha256:${"a".repeat(64)}` }],
    decision_references: [{ decision_type: "sufficiency", decision_id: "00000000-0000-4000-8000-000000000010" }],
    artifact_references: [{
      artifact_type: "evidence_packet",
      artifact_id_hash: `sha256:${"b".repeat(64)}`,
      content_digest: `sha256:${"c".repeat(64)}`,
    }],
  };
  assert.equal(validateTrace(event), true, JSON.stringify(validateTrace.errors));
});

test("effect receipts require bound identity, policy, signed service evidence, and readback", async () => {
  const validateReceipt = await validator("effect-receipt.schema.json");
  const result = await completedRun();

  for (const mutate of [
    (receipt) => { delete receipt.tenant_hash; },
    (receipt) => { delete receipt.policy_revision; },
    (receipt) => { delete receipt.service_receipt.signature; },
    (receipt) => { delete receipt.readback.observed_postcondition_digest; },
  ]) {
    const receipt = structuredClone(result.effect_receipt);
    mutate(receipt);
    assert.equal(validateReceipt(receipt), false, JSON.stringify(validateReceipt.errors));
  }
});

test("forged service and readback attestations cannot prove completion", async () => {
  const forgedService = createInvoiceWorld({ forgeServiceReceipt: true });
  const serviceResult = await runInvoiceException(structuredClone(baseInput), forgedService.deps);
  assert.equal(serviceResult.state, "escalated");
  assert.equal(serviceResult.stop_reason, "service_receipt_invalid");
  assert.equal(forgedService.state.incidents, 1);

  const forgedReadback = createInvoiceWorld({ forgeReadbackAttestation: true });
  const readbackResult = await runInvoiceException(structuredClone(baseInput), forgedReadback.deps);
  assert.equal(readbackResult.state, "postcondition_failed");
  assert.equal(readbackResult.stop_reason, "readback_mismatch");
  assert.equal(forgedReadback.state.compensations, 0);
  assert.equal(forgedReadback.state.incidents, 1);
});

test("the pinned synthetic OTLP sample preserves trace lineage and excludes raw content", async () => {
  const contract = await readFile(path.join(root, "operations", "telemetry-contract.md"), "utf8");
  const block = contract.split("#### Synthetic OTLP trace")[1].match(/```json\n([\s\S]*?)\n```/)[1];
  const [sample] = JSON.parse(block).resourceSpans[0].scopeSpans;
  assert.equal(sample.schemaUrl, "https://opentelemetry.io/schemas/semconv-genai-dev/0.1.0-dev");
  const [agent, model, tool] = sample.spans;
  assert.match(agent.traceId, /^[0-9a-f]{32}$/);
  assert.match(agent.spanId, /^[0-9a-f]{16}$/);
  for (const child of [model, tool]) {
    assert.equal(child.traceId, agent.traceId);
    assert.equal(child.parentSpanId, agent.spanId);
  }
  const operationNames = sample.spans.map(({ attributes }) => (
    attributes.find(({ key }) => key === "gen_ai.operation.name").value.stringValue
  ));
  assert.deepEqual(operationNames, ["invoke_agent", "chat", "execute_tool"]);
  assert.equal(tool.attributes.find(({ key }) => key === "gen_ai.agent.name").value.stringValue, "invoice_review");
  const allowed = new Set([
    "gen_ai.operation.name", "gen_ai.agent.name", "gen_ai.provider.name", "gen_ai.request.model",
    "gen_ai.tool.name", "gen_ai.tool.type",
  ]);
  assert.ok(sample.spans.flatMap(({ attributes }) => attributes).every(({ key }) => allowed.has(key)));
});

test("case reports retain the original cohort through pending, late, and corrected verification", () => {
  const fixture = {
    admissions: [{ caseId: "invoice-1", arrivedAt: 10 }],
    attempts: [{ caseId: "invoice-1", runId: "abandoned-1", recordedAt: 13, attemptCostCents: 25, disposition: "abandoned" }],
    verifications: [
      { caseId: "invoice-1", revision: 2, occurredAt: 18, observedAt: 19, disposition: "rejected" },
      { caseId: "invoice-1", revision: 1, occurredAt: 14, observedAt: 16, disposition: "accepted" },
    ],
    windowStart: 10, windowEnd: 15,
  };
  const pending = reportCaseOutcomes({ ...fixture, asOf: 15 });
  const late = reportCaseOutcomes({ ...fixture, asOf: 16 });
  const corrected = reportCaseOutcomes({ ...fixture, asOf: 20 });
  assert.deepEqual(pending, {
    eligibleCases: 1, acceptedCases: 0, pendingCases: 1,
    attempts: 1, attemptDispositions: { completed: 0, failed: 0, abandoned: 1, pending: 0 },
    attemptCompletionRate: 0, attemptCostCents: 25, acceptedOutcomeRate: 0,
  });
  assert.deepEqual(late, { ...pending, pendingCases: 0, acceptedCases: 1, acceptedOutcomeRate: 1 });
  assert.deepEqual(corrected, { ...late, acceptedCases: 0, acceptedOutcomeRate: 0 });
  assert.deepEqual(reportCaseOutcomes({ ...fixture, asOf: 15 }), pending);
});

test("duplicate older verifier revisions are rejected in any observation order", () => {
  const initial = { caseId: "invoice-1", revision: 1, occurredAt: 11, observedAt: 11, disposition: "accepted" };
  const correction = { ...initial, revision: 2, observedAt: 12, disposition: "rejected" };
  for (const verifications of [[initial, correction, initial], [correction, initial, initial]]) {
    assert.throws(() => reportCaseOutcomes({
      admissions: [{ caseId: "invoice-1", arrivedAt: 10 }], attempts: [], verifications,
      windowStart: 10, windowEnd: 15, asOf: 15,
    }), /duplicate verifier revision/);
  }
});

test("case reporting rejects malformed IDs, times, and chronology before counting evidence", () => {
  const admission = { caseId: "invoice-1", arrivedAt: 11 };
  const attempt = {
    caseId: admission.caseId, runId: "run-1", recordedAt: 12, attemptCostCents: 10, disposition: "completed",
  };
  const verification = {
    caseId: admission.caseId, revision: 1, occurredAt: 12, observedAt: 13, disposition: "accepted",
  };
  const fixture = {
    admissions: [admission], attempts: [attempt], verifications: [verification],
    windowStart: 10, windowEnd: 15, asOf: 12,
  };
  for (const window of [
    { windowStart: "10" }, { windowEnd: 10 }, { asOf: NaN }, { asOf: 9 }, { asOf: 10.5 },
  ]) assert.throws(() => reportCaseOutcomes({ ...fixture, ...window }), /invalid reporting window or cutoff/);

  for (const invalidAdmission of [
    { caseId: undefined }, { caseId: " " }, { arrivedAt: "11" }, { arrivedAt: NaN },
  ]) assert.throws(() => reportCaseOutcomes({
    ...fixture, admissions: [{ ...admission, ...invalidAdmission }],
  }), /invalid case admission/);

  for (const [invalidAttempt, expected] of [
    [{ caseId: 1 }, /invalid attempt record/],
    [{ runId: undefined }, /invalid attempt record/],
    [{ recordedAt: Infinity }, /invalid attempt record/],
    [{ recordedAt: 10 }, /predates admission/],
  ]) assert.throws(() => reportCaseOutcomes({
    ...fixture, attempts: [{ ...attempt, ...invalidAttempt }],
  }), expected);

  for (const invalidVerification of [
    { caseId: undefined }, { observedAt: undefined }, { observedAt: NaN }, { observedAt: "13" },
    { observedAt: 11 }, { occurredAt: 9 }, { occurredAt: null },
  ]) assert.throws(() => reportCaseOutcomes({
    ...fixture, verifications: [{ ...verification, ...invalidVerification }],
  }), /invalid verifier record/);

  assert.equal(reportCaseOutcomes(fixture).pendingCases, 1);
  assert.equal(reportCaseOutcomes({ ...fixture, asOf: 13 }).acceptedCases, 1);
});

test("case reporting rejects overflow from individually safe attempt costs", () => {
  const fixture = {
    admissions: [{ caseId: "invoice-1", arrivedAt: 10 }],
    attempts: ["first", "second"].map((runId) => ({
      caseId: "invoice-1", runId, recordedAt: 11,
      attemptCostCents: runId === "first" ? Number.MAX_SAFE_INTEGER : 1, disposition: "completed",
    })),
    verifications: [], windowStart: 10, windowEnd: 15, asOf: 15,
  };
  assert.throws(() => reportCaseOutcomes(fixture), /total attempt cost exceeds safe integer cents/);
});
