# Worked Adoption and Handoff Plan

This record is intentionally incomplete. It shows what must be fixed before a pilot begins and what the receiving team must exercise before delivery-team exit. No exercise below has been run in a customer environment.

## Adoption contract to freeze before pilot entry

| Field | Predeclared definition |
| --- | --- |
| Eligible denominator | Domestic price-variance exceptions meeting policy revision 8 and source-quality requirements; exclude duplicate, cross-tenant, payment-execution, and unsupported-policy cases |
| Exposure | Eligible case rendered in the persistent review queue with cited evidence |
| Completion | Reviewer approves, edits, rejects, or explicitly escalates the proposal |
| Accepted review packet | An independent verifier confirms the packet supports the correct disposition without material correction, including a policy-supported no-action when appropriate; rejection of an incorrect packet does not count |
| Target | At least 60% of eligible cases exposed and 80% of exposed cases have an independently accepted review packet in the named trial window |
| Guardrails | Zero prohibited or unverified effects; correction or rejection below 20%; abandonment below 10%; reviewer wait and support load within named capacity |
| Sources | Versioned queue eligibility query, review-surface events, case evidence and verifier dispositions, support records, and time study |
| Owner | Accounts-payable service owner; finance controls manager verifies acceptance |

The actual target dates, source queries, event schemas, timezone, late-event policy, identity-deduplication rule, baseline status, and reviewer-capacity limit remain open. That blocks pilot entry.

## What the adoption path would have to prove

The current process starts in the manual exception queue. The proposed path adds a persistent review surface that assembles cited evidence and a staged correction while leaving approval and posting with the designated reviewer. That may help, but the fixture has not shown that an operator can find the right case, trust the evidence, complete the review faster, recover from a bad proposal, or obtain support.

| Funnel stage | Required target evidence | Current evidence state |
| --- | --- | --- |
| Eligible opportunity | Versioned query for domestic price-variance exceptions under policy revision 8, with declared exclusions | No target query or observed population |
| Exposed in the review surface | Event proving an eligible case was rendered to an authorized reviewer with cited evidence | No implemented target surface or event |
| Completed or dispositioned | Reviewer approves, edits, rejects, or escalates; abandonment and reason are recorded | No target users or interaction evidence |
| Independently accepted | Verifier confirms the review packet supports the correct disposition without material correction | Deterministic fixture cases only; no target review acceptance |
| Verified business effect | For a later authorized workflow only, approved correction matches the proposal digest and ledger readback | Not measured or authorized by the trial |
| Sustained net value | Attributable benefit, less reviewer, support, assurance, incident, and operating cost | No pilot or production window |

## Friction hypotheses to test

These are test questions, not findings:

- **Access and routing:** can the designated reviewer reach the right eligible case through the normal workday path without a delivery-team workaround?
- **Evidence and trust:** does the packet show the invoice, purchase order, policy revision, missing facts, and proposed change clearly enough to support a decision?
- **Action safety:** can the reviewer edit, reject, escalate, pause, and resume while the manual queue remains available?
- **Workday benefit:** does the surface reduce handling time or rework without moving hidden verification and support work to the reviewer?
- **Capacity:** can the review and support owners handle the proposed cohort's peak queue, wait, correction, and escalation load?

## How a pilot result would be diagnosed

This table is predeclared planning logic. It contains no observed pilot result.

| First weak transition | Initial interpretation | Bounded response |
| --- | --- | --- |
| Eligible -> exposed | Eligibility query, integration, access, routing, latency, or source quality is wrong | Repair the path or narrow the segment; do not call it user resistance |
| Exposed -> completed | Surface placement, evidence, timing, training, or fallback is wrong | Observe cases and repair the workflow before adding users |
| Completed -> accepted | Proposal quality, evidence sufficiency, policy, or authority is wrong | Repair context, mechanism, evaluation, or boundary |
| Accepted -> less reviewer effort | The bottleneck, baseline, or attribution model is wrong | Revisit the value case or stop |
| Effect -> sustained net value | Review, support, incident, or operating cost is too high | Constrain the cohort, redesign operation, or stop |

## Receiving-team exercises

| Capability | Required demonstration | Current state |
| --- | --- | --- |
| Explain scope and limits | Receiving owner leads a review of the recommendation-only boundary | Not run |
| Reproduce adoption | Run numerator, denominator, exclusions, and guardrail queries from authoritative sources | Not run |
| Enable a representative cohort | Receiving team owns access, training, support, and the first-use path | Not run |
| Diagnose one adoption break | Use representative cases and reason codes to assign the owning layer and response | Not run |
| Add an evaluation case | Author one representative exception and one negative authority case | Not run |
| Release and rollback | Promote an isolated compatible candidate and restore the prior release | Not run |
| Contain and reconcile | Use the kill switch, identify affected effects, and verify ledger state | Not run |
| Support an operator | Resolve a pilot support case and classify the learning | Not run |
| Retire the service | Tabletop identity, tools, schedules, state, evidence, users, and manual fallback | Not run |

## Exit decision

`handoff_blocked`. Documentation and passing fixture tests are not exercised operating capability. The delivery team must not exit into a production handoff, and the service must not claim bounded production, until the receiving team leads the required paths with inspectable evidence.
