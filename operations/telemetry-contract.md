# Agent Telemetry Contract

Machine-readable reference contracts cover state transitions in [`trace-event.schema.json`](../schemas/trace-event.schema.json) and consequential effects in [`effect-receipt.schema.json`](../schemas/effect-receipt.schema.json). The broader topology below is the production telemetry profile: an implementation MUST encode its tool, policy, inference, human-interaction, and verification events in closed deployment-specific schemas before claiming full conformance. The repository validator does not imply that those additional event types are schema-validated here.

The shared state-transition `details` vocabulary is workflow-neutral: it carries only hashed source revisions, typed decision references, hashed artifact references, effect-and-receipt references, and closed error codes. Domain payloads and raw business identifiers stay out of telemetry. A deployment that needs another detail shape MUST publish a versioned closed schema or a separately versioned event type; it must not reopen the shared object with arbitrary properties.

Controls: `OPS-001`, `SEC-004`.

## Production telemetry topology

```mermaid
flowchart TD
    R["agent.run"] --> C["agent.context.build"]
    R --> M["agent.model.inference"]
    R --> T["agent.tool.call"]
    T --> P["agent.policy.decision"]
    T --> E["agent.external.effect"]
    E --> B["agent.postcondition.readback"]
    R --> H["agent.human.interaction"]
    R --> S["agent.state.transition"]
    R --> V["agent.verification"]
```

## Required state-transition run attributes

The runtime envelope also requires `schema_version`, event time, trace/span identity, release digest, closed component versions, actor mode, and retention class. State-specific `details` accept only the identifiers, hashes, revisions, and error codes declared in the schema.

| Attribute | Type | Cardinality | Classification |
| --- | --- | ---: | --- |
| `agent.run.id` | UUID | 1 | internal |
| `agent.operation.id` | stable SHA-256 business-operation ID | 1 | internal |
| `agent.release.digest` | SHA-256 release-manifest digest | 1 | internal |
| `agent.system.id` | string | 1 | public |
| `agent.system.version` | semver | 1 | public |
| `agent.workflow.id` | string | 1 | internal |
| `agent.workflow.state` | string | 1/span | internal |
| `agent.tenant.hash` | string | 1 | confidential |
| `agent.principal.id_hash` | string | 1 | confidential |
| `agent.caller.id_hash` | string | 0..1 | confidential |
| `agent.actor.mode` | interactive_delegated / unattended_workload / mixed | 1 | internal |
| `agent.autonomy.level` | enum | 1 | internal |
| `agent.stop.reason` | controlled identifier from the workflow's tested vocabulary | 1 | internal |
| `agent.steps.count` | integer | 1 | internal |
| `agent.cost.usd` | number | 1 | confidential |
| `agent.accepted_outcome` | boolean | 1 | internal |

`agent.accepted_outcome` MUST be true only after confirmation by the workflow charter's declared independent verifier, authoritative source, or accountable reviewer. A terminal workflow state or model assertion is insufficient. The deployment MUST retain verifier provenance and the evidence reference in a separate closed verification event or domain record correlated to the trace; the shared trace-event schema does not encode those fields. Controls: `FDE-001`, `VAL-002`, `OPS-001`, `OPS-006`.

## Required tool span attributes

These fields define the minimum deployment span. They are not accepted by the state-transition schema; emit them through a separate closed tool-span contract and correlate them by run, operation, release, trace, and parent span.

| Attribute | Type |
| --- | --- |
| `agent.tool.id` | string |
| `agent.tool.version` | semver |
| `agent.tool.kind` | query / compute / stage_write / commit_write / administrative |
| `agent.tool.effect_class` | none / staged / reversible / irreversible |
| `agent.tool.attempt` | integer |
| `agent.tool.idempotency_key_hash` | string |
| `agent.tool.status` | ok / error / denied / timeout |
| `agent.tool.error_class` | retryable / terminal / authorization / validation / escalation |
| `agent.tool.duration_ms` | integer |

## Required policy event

This example is a deployment event shape, not an alternative payload for `trace-event.schema.json`. A production implementation MUST define a closed schema, retention class, correlation fields, and redaction policy for it.

Controls: `OPS-001`, `SEC-004`.

```json
{
  "event_name": "agent.policy.decision",
  "policy_id": "commit-resolution",
  "policy_version": "3.2.1",
  "policy_digest": "sha256:...",
  "agent_principal_hash": "sha256:...",
  "caller_principal_hash": "sha256:...",
  "tenant_hash": "sha256:...",
  "action": "commit_resolution",
  "resource_hash": "sha256:...",
  "decision": "allow",
  "obligations": ["approval_digest_match", "postcondition_readback"],
  "reason_code": "AUTHORIZED_APPROVER"
}
```

## Required effect receipt

```json
{
  "schema_version": "1.2.0",
  "effect_id": "uuid",
  "run_id": "uuid",
  "operation_id": "sha256:...",
  "release_digest": "sha256:...",
  "tenant_hash": "sha256:...",
  "account_hash": "sha256:...",
  "agent_principal_hash": "sha256:...",
  "caller_principal_hash": "sha256:...",
  "action": "commit_resolution",
  "effect_class": "reversible",
  "resource_hash": "sha256:...",
  "source_revision": "ledger-revision-42",
  "proposal_digest": "sha256:...",
  "idempotency_key_hash": "sha256:...",
  "policy_decision_id": "uuid",
  "policy_revision": "policy-3.2.1",
  "approval_id": "uuid",
  "expected_postcondition_digest": "sha256:...",
  "service_receipt": {
    "algorithm": "Ed25519",
    "key_id": "ledger-signing-key-2026-08",
    "issuer": "system-of-record",
    "subject": {
      "receipt_id": "opaque-id",
      "effect_id": "uuid",
      "run_id": "uuid",
      "operation_id": "sha256:...",
      "release_digest": "sha256:...",
      "tenant_hash": "sha256:...",
      "account_hash": "sha256:...",
      "agent_principal_hash": "sha256:...",
      "caller_principal_hash": "sha256:...",
      "action": "commit_resolution",
      "effect_class": "reversible",
      "resource_hash": "sha256:...",
      "source_revision": "ledger-revision-42",
      "proposal_digest": "sha256:...",
      "idempotency_key_hash": "sha256:...",
      "policy_decision_id": "uuid",
      "policy_revision": "policy-3.2.1",
      "approval_id": "uuid",
      "expected_postcondition_digest": "sha256:...",
      "committed_at": "ISO-8601"
    },
    "subject_digest": "sha256:...",
    "signature": "base64url-ed25519-signature"
  },
  "committed_at": "ISO-8601",
  "readback": {
    "run_id": "uuid",
    "readback_request_id": "uuid",
    "requested_at": "ISO-8601",
    "status": "matched",
    "source": "system-of-record",
    "revision": "ledger-revision-43",
    "verified_at": "ISO-8601",
    "verifier": "postcondition-verifier",
    "expected_postcondition_digest": "sha256:...",
    "observed_postcondition_digest": "sha256:...",
    "attestation": {
      "algorithm": "Ed25519",
      "key_id": "ledger-signing-key-2026-08",
      "issuer": "system-of-record",
      "subject_digest": "sha256:...",
      "signature": "base64url-ed25519-signature"
    }
  },
  "compensation": {
    "status": "available",
    "reference": "compensate-resolution"
  }
}
```

The committing service, not the model or harness, signs the canonical `service_receipt.subject`. The top-level effect receipt preserves the originating signed `run_id`; a later retry has its own trace run but returns that original receipt rather than rewriting its audit identity. The readback service signs a separate canonical attestation over the requesting run and unique request ID, request time, effect, operation, resource, source revision, expected postcondition, observed postcondition, and verification time. The runtime MUST verify both signatures with trusted keys, compare every repeated binding, enforce timestamp order, and fail closed before treating the effect as complete. A timeout-recovery receipt is accepted only when the full business-operation tuple matches the attempted commit.

Controls: `IAM-001`, `IAM-002`, `REL-001`, `REL-003`, `OPS-001`.

## Consequential human decisions

For a human approval, rejection, correction, or override that can change a consequential workflow decision, the deployment SHOULD keep a purpose-bound decision record: proposal and evidence references, source and policy revisions, authorized actor, disposition, stated reason or reason-unknown, and later independently verified outcome when available. Link it to the run and effect receipt without putting raw business identifiers or sensitive free text in the shared trace event. Classify, minimize, restrict, and retain the reason under the owning organization's data policy. A reviewer reason is evidence to investigate, not policy or a ground-truth label. Missing reasons and pending outcomes stay explicit. A candidate rule change still needs owner review, independent evaluation, approval, and the ordinary release path. `OPS-001`, `HUM-003`, `EVA-006`, `OPS-007`. [R26-91](../research/2026-09-23--decision-models-and-decision-learning.md#r26-91)

## Stop reasons

The shared vocabulary is `completed`, `completed_after_timeout_recovery`, `completed_after_reconciliation`, `tenant_mismatch`, `stale_source_revision`, `stale_policy`, `context_load_failed`, `validation_failed`, `policy_denied`, `policy_denied_at_commit`, `idempotency_conflict`, `approval_rejected`, `approval_expired`, `approval_time_invalid`, `approval_identity_invalid`, `approval_digest_mismatch`, `policy_denied_before_commit`, `release_not_admitted`, `service_receipt_invalid`, `readback_denied`, `readback_mismatch`, `budget_exhausted`, `timeout_exhausted`, `cancelled`, `circuit_breaker`, and `internal_error`.

`trace-event.schema.json` constrains a stop reason to an opaque identifier rather than a universal enum because domain workflows need narrower extensions. Each agent-system design MUST publish and test its allowed vocabulary. The invoice reference uses `stale_invoice_revision` as its domain-specific form of `stale_source_revision`.

Control: `OPS-001`.

## Core SLIs

```text
accepted_outcome_rate = verifier_confirmed_accepted_cases_as_of_cutoff / eligible_cases
unauthorized_effect_rate = unauthorized_effects / external_effects
duplicate_effect_rate = duplicate_effects / external_effects
postcondition_failure_rate = mismatched_readbacks / external_effects
attempt_intervention_rate = attempts_with_human_intervention / observed_attempts
cost_per_accepted_outcome = full_attributed_cohort_cost / verifier_confirmed_accepted_cases_as_of_cutoff
trace_completeness = traces_with_required_fields / traces_sampled
```

### Reconcile cases, attempts, and observations

Freeze the eligible cohort at source-case arrival. Join the charter's stable, scoped case identity to the independent verifier's disposition, and count each case at most once at the declared cutoff. An operation identifier deduplicates a particular effect. A run identifier deduplicates metered attempts. Neither establishes the eligible-case denominator. Even when two runs each emit `agent.accepted_outcome: true` after checking the same receipt, the business outcome still counts once.

Attribute both attempt costs, including failed or abandoned attempts, and applicable review, support, and recovery costs to the cohort. Report attempt completion separately across settled attempts and show pending attempts and their observed costs. Keep an unverified case pending at the applicable evidence cutoff. Link late and correcting verifier records to the original cohort, preserve the event and observation times, and issue a new as-of report without revising the previously issued result. A correction can withdraw acceptance. See the [whole-case cost and timing rules](slo-scorecard.md#measure-the-whole-case) and [invoice reporting projection](../examples/invoice-exception/case-outcomes.mjs). The linked projection operates on already reconciled synthetic inputs and includes attempt cost only. `OPS-001`, `EVA-006`, `CST-001`.

### Optional OpenTelemetry mapping

The topology names above are local. A telemetry exporter can translate an agent invocation, inference request, and tool invocation into pinned OpenTelemetry GenAI spans while preserving trace and parent span IDs. Use the [standalone GenAI conventions v0.1.0](https://github.com/open-telemetry/semantic-conventions-genai/releases/tag/v0.1.0) with scope schema URL `https://opentelemetry.io/schemas/semconv-genai-dev/0.1.0-dev`. The agent span guidance is at Development status. Validate on each mapping upgrade. The [sanitized synthetic OTLP trace](#synthetic-otlp-trace) illustrates the export and does not replace policy decisions, effect receipts, or independent verification evidence. [R26-99](../research/2026-11-25--agent-evaluation-and-operating-evidence.md#r26-99)

Apply the export allowlist before emitting success, retry, fallback, and error signals. Raw input, output, instructions, tool arguments, tool results, and hidden reasoning stay out of this mapping. Do not export business case identifiers as metric attributes. Correlate independently authorized evidence through internal run and trace IDs without putting protected evidence in the exported trace. `OPS-001`, `SEC-004`.

#### Synthetic OTLP trace

This trace represents a hypothetical model-directed invoice review. It illustrates the mapping independently of the deterministic invoice runtime.

```json
{
  "resourceSpans": [
    {
      "resource": {
        "attributes": [
          {
            "key": "service.name",
            "value": {
              "stringValue": "invoice-review-fixture"
            }
          }
        ]
      },
      "scopeSpans": [
        {
          "scope": {
            "name": "invoice-review.trace-example"
          },
          "schemaUrl": "https://opentelemetry.io/schemas/semconv-genai-dev/0.1.0-dev",
          "spans": [
            {
              "traceId": "cdd0413049124f61819979bba11acfcc",
              "spanId": "17f6ab54466bb009",
              "name": "invoke_agent invoice_review",
              "kind": 1,
              "startTimeUnixNano": "1786122000000000000",
              "endTimeUnixNano": "1786122000040000000",
              "attributes": [
                {
                  "key": "gen_ai.operation.name",
                  "value": {
                    "stringValue": "invoke_agent"
                  }
                },
                {
                  "key": "gen_ai.agent.name",
                  "value": {
                    "stringValue": "invoice_review"
                  }
                }
              ]
            },
            {
              "traceId": "cdd0413049124f61819979bba11acfcc",
              "spanId": "718e9270ea3a7961",
              "name": "chat example-small",
              "kind": 3,
              "startTimeUnixNano": "1786122000005000000",
              "endTimeUnixNano": "1786122000020000000",
              "parentSpanId": "17f6ab54466bb009",
              "attributes": [
                {
                  "key": "gen_ai.operation.name",
                  "value": {
                    "stringValue": "chat"
                  }
                },
                {
                  "key": "gen_ai.provider.name",
                  "value": {
                    "stringValue": "example"
                  }
                },
                {
                  "key": "gen_ai.request.model",
                  "value": {
                    "stringValue": "example-small"
                  }
                }
              ]
            },
            {
              "traceId": "cdd0413049124f61819979bba11acfcc",
              "spanId": "2859f510285728a1",
              "name": "execute_tool read_invoice",
              "kind": 1,
              "startTimeUnixNano": "1786122000022000000",
              "endTimeUnixNano": "1786122000025000000",
              "parentSpanId": "17f6ab54466bb009",
              "attributes": [
                {
                  "key": "gen_ai.operation.name",
                  "value": {
                    "stringValue": "execute_tool"
                  }
                },
                {
                  "key": "gen_ai.agent.name",
                  "value": {
                    "stringValue": "invoice_review"
                  }
                },
                {
                  "key": "gen_ai.tool.name",
                  "value": {
                    "stringValue": "read_invoice"
                  }
                },
                {
                  "key": "gen_ai.tool.type",
                  "value": {
                    "stringValue": "function"
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Telemetry controls

- Hash or tokenize tenant, principal, resource, and idempotency identifiers.
- Enforce the closed trace schema at ingestion and reject undeclared payload fields.
- Never record credentials, raw authorization tokens, hidden model reasoning, or unrestricted retrieved content.
- Record model, prompt, tool, policy, ontology, schema, evaluator, and runtime versions.
- Sample successful read-only runs; retain 100% of denied, failed, write, incident, and rollback runs subject to policy.
- Apply field-level retention by classification and incident/legal requirements.
