# ADR: Decision Title

| Field | Value |
| --- | --- |
| ADR ID | |
| Status | proposed / accepted / superseded / deprecated |
| Date | |
| Owners | |
| Related systems | |
| Supersedes | |

## Decision contract

| Dimension | Requirement |
| --- | --- |
| Outcome | |
| Operational decision and accepted outcome | |
| System context and affected users/systems | |
| Constraints | |
| Invariants | |
| Quality, latency, risk, adoption, and full-cost ceiling | |
| Accepted residual risk | |
| Revisit trigger | |

## Architecture views

| View | Link or summary |
| --- | --- |
| System context: users, sources, downstream systems, owner | |
| Component boundaries: state, policy, model/ML, tools, UI, operations | |
| Decision/state transitions and postconditions | |
| Deployment/trust boundaries: identity, tenancy, credentials, egress, isolation | |

## Intelligence selection

| Field | Value |
| --- | --- |
| Intelligence-selection record | |
| Deterministic/optimization/ML baseline | |
| Foundation-model or agent rationale, if selected | |
| Human-review and escalation path | |
| Component versions, authority ceilings, monitors, and retirement triggers | |

## Options

| Option | Quality | Latency | Full cost | Security | Operability | Adoption | Lock-in | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| | | | | | | | | |

## Selected option

| Field | Value |
| --- | --- |
| Option | |
| Control IDs | |
| Measured evidence | |
| Rejected alternatives | |
| Migration path | |
| Rollback path | |
| Compatibility boundary | |

## Verification

| Test | Threshold | Fixture | Owner |
| --- | --- | --- | --- |
| | | | |

For the quality requirement most likely to change the decision, describe the trigger, what is affected, operating conditions, expected response, and pass or hold measure. Point to a test or observation. For a worker upgrade, include a pending record written by the previous release and verify the effect through source-of-truth readback.

If this decision relies on a host application or shared platform, link the [inherited foundation evidence](production-service-readiness.md#application-and-platform-baseline). Record the applicable build or configuration revision, implementing and accountable owners, target integration evidence, expiry or recheck trigger, and what stays on hold if evidence is missing or stale. See the [worked recovery review](../examples/invoice-exception/durable-recovery/README.md#worked-architecture-review-upgrade-while-work-is-pending).
