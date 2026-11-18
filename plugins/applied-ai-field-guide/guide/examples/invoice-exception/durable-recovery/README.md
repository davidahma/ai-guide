# Durable Recovery Lab: One Effect, an Interrupted Process, and Readback

This 20-minute fictional lab asks a narrow operational question: after a process stops at the worst possible moment, how does the next process know whether it may retry, reconcile, or escalate?

It extends the [invoice exception reference](../README.md), but it is a separate local exercise. The reference runtime uses in-memory fixtures to make the controlled-write boundary readable. This lab persists a tiny local operation record so you can inspect a restart and an ambiguous external effect. Neither artifact is a deployment design or production evidence.

## Run it

You need Node.js 22 and a local clone. The lab uses only a disposable directory under the operating system's temporary folder. It makes no network calls, reads no credentials, and leaves no state behind after the demonstration.

```bash
npm ci --ignore-scripts
npm run test:durable-recovery
node examples/invoice-exception/durable-recovery/run-lab.mjs
```

The demonstration writes four copies of pending state in the previous worker's format (`1.0.0`). In one copy the previous worker already committed the simulated effect; in the others it stopped after recording intent. A new Node process opens each copy, uses the original operation key, and decides what to do based on readback and current authority. The reported effect counts are **1, 0, 0, 1**. The last case has one effect because the previous worker committed it, not because the new worker retried it.

## The decision rule

```text
read pending intent using the original business-operation key
  -> matching committed effect? reconcile without another write
  -> readback unavailable or inconsistent? keep pending; escalate
  -> confirmed absence but approval or policy changed? hold; escalate
  -> confirmed absence and unchanged authority? resume only if explicitly enabled
```

| Case | What the test proves in this fixture | Safe disposition |
| --- | --- | --- |
| Previous worker stopped before committing; approval and policy are still current | The new worker sees authoritative absence, resumes explicitly with the old key, and verifies one write | `resumed_after_verified_absence` |
| Previous worker stopped before committing; policy changed | The new worker holds even if the new request supplies the updated revision. The old intent was not approved under that revision. | `approval_or_policy_changed_before_effect` |
| Previous worker's outcome cannot be read back | The pending record blocks a retry. An unavailable source is not proof of absence. | `readback_unavailable_escalate` |
| Previous worker committed but didn't receive a receipt | The new worker verifies the existing committed record, even after approval changes; no new effect is authorized | `reconciled_existing_effect` |
| Duplicate delivery after completion | The same operation key returns the receipt only after matching readback | `existing_verified_effect` |
| Tenant or scope mismatch | No operation may produce an effect | `denied` |

The `effect_created` field is the simulator's record of a new effect; it is not a receipt. If a first write succeeds but readback is unavailable, the result can report `effect_created: true` and still keep the operation pending with no receipt. A later process reconciles the same recorded write. For each receipt the simulator rereads its file and checks the committed record rather than returning the object it wrote from memory.

The source is deliberately small:

- [durable-recovery.mjs](durable-recovery.mjs) persists operation intent, a simulated effect ledger, and a short audit record with temp-file-and-rename writes.
- [previous-release-fixture.mjs](previous-release-fixture.mjs) holds the previous writer's record shape and fixed IDs, and starts the candidate worker in a separate Node process.
- [run-lab.mjs](run-lab.mjs) replays the four scenarios in disposable directories.
- [durable-recovery.test.mjs](durable-recovery.test.mjs) owns the failure assertions; it is not called by the candidate world.

## Worked architecture review: Upgrade while work is pending

The accounts-payable workflow owner needs to change the worker without duplicating an invoice resolution. In this example the reviewer approves the resolution, the worker records intent before it writes, and the invoice system owns the committed result. The operations lead handles held items. Recovery does not ask a language model to infer whether a write happened: deterministic code checks status, identity, and policy; a person decides what to do when the evidence or approval is missing. Blind retries risk a second write. Holding every item is safer but sends even verifiable cases to a manual queue.

| Scenario field | Filled example |
| --- | --- |
| Trigger and operating condition | The old worker stops after the invoice system accepts the write but before the worker records a receipt. A new worker loads the pending item after the approval revision has changed. |
| Expected response | Confirm the existing commit using the tenant, invoice, and original operation key. Record the receipt without making a new write. If the source cannot answer, leave the item pending and route it to the operations lead. |
| Acceptance measure | Exactly one committed effect and no second write. The receipt identifies the old effect. The failure branch returns no receipt and makes no write. |
| Evidence and decision | The [local regression tests](durable-recovery.test.mjs) show this for one worker at a time and the `1.0.0` state format. Keep that format and key unchanged for this exercise; reject unknown formats. A target upgrade remains on hold until operations tests the actual queue, candidate worker, and invoice service together. |

The shared queue may supply delivery and retries. That does not establish duplicate protection or prove that the invoice system committed the resolution. A completed [inherited foundation record](../../../templates/production-service-readiness.md#application-and-platform-baseline) keeps those responsibilities separate:

| Field | Illustrative record: shared invoice queue |
| --- | --- |
| Revision and responsibility | Queue delivery policy `queue-policy-7`, candidate invoice worker `worker-2`. The platform queue owner owns delivery and redelivery. The accounts-payable service owner owns stable operation keys, invoice-system readback, and the held-item process. |
| Evidence and recheck | The local test checks the key, pending-state compatibility, and readback decisions. Target evidence is missing: capture one staging drill across worker versions using those exact revisions, with queue delivery records and invoice-system commit/readback evidence. Recheck before rollout and after changes to worker format, retry policy, or the invoice readback contract. An accepted drill expires after 90 days for this illustrative service. |
| Hold and rollback | **Hold the candidate worker rollout.** Do not allow it to process pending writes if the staging evidence is missing or stale. If the candidate has already started processing, pause its writes and reconcile outstanding items before switching back. Confirm the previous worker can read records written by the candidate before using it for rollback. |

Record the same decision for your system in an [architecture decision record](../../../templates/architecture-decision-record.md). The relevant controls cover deterministic boundaries, duplicate safety, readback, authority rechecks, and release changes: `ARC-002`, `REL-001`, `REL-003`, `REL-005`, `OPS-007`.

## What to carry into a real service

Keep the shape, not this storage code. A target service needs a stable business-operation identity; durable, transactionally appropriate workflow and business state; current service-side authorization; idempotency enforced by the effect system; concurrency and ordering behavior; source-of-truth readback; audit retention; cancellation; backpressure; migration; backup and restore; incident ownership; and tested recovery objectives.

This lab's JSON file has no lock, fsync, replication, corruption handling, retention policy, tenancy enforcement below the simulated request check, or competing-worker protection. An atomic rename does not prove a durable commit or exactly-once processing. The simulated effect ledger is not an external system of record. Do not copy this code into a production service.

Use [Enterprise Integration and Scale Reality](../../../library/17-enterprise-integration-and-scale-reality.md) to map those missing seams, [Evaluation Corpus and Review Loops](../../../library/09-evaluation-corpus-and-review-loops.md) to build target cases, and [production release gates](../../../operations/release-gates.md) before asserting recovery readiness.
