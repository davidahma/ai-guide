# Finance Variance Commentary: a Review-First Applied AI Walkthrough

This compact, fictional walkthrough shows one finance workflow without treating a model as a calculator, a source of financial truth, or an approval authority. It is a design exercise, not accounting advice, a close-process specification, or evidence that a customer has adopted the approach.

## The decision

At period close, a finance reviewer needs a clear explanation of material actual-versus-plan variances for an internal management pack. The problem is rarely subtraction. It is assembling current, reconcilable figures and the accountable explanations behind them before the reviewer decides what can be distributed.

```text
governed actuals and approved plan
  -> deterministic variance calculation and materiality route
  -> source-linked owner explanation
  -> model drafts a review packet
  -> finance reviewer approves, edits, rejects, or requests evidence
  -> approved commentary is distributed through the existing close process
```

The accepted outcome is **a finance reviewer accepts or rejects a commentary packet whose numbers reconcile to governed sources and whose explanations are attributable**. The system does not claim that it explains a variance correctly, changes a forecast, posts a journal entry, or approves distribution.

## Start with one bounded review

Begin with one department, one close period, and a read-only copy of the approved actuals, plan version, and materiality policy. Observe the current workflow before proposing automation:

1. Inspect a small set of recent material variance records with the finance reviewer. Trace the current calculation, owner request, evidence checked, late changes, and distribution step.
2. Confirm who owns actuals, the approved plan, materiality thresholds, cost-centre explanations, and final commentary approval. Record source revisions and freshness expectations.
3. Keep missing plan versions, unreconciled amounts, unsupported explanations, and late corrections visible as exceptions. They are not prompt gaps to smooth over.
4. Define a narrow review packet and an explicit manual fallback. Stop if the figures cannot be reconciled, the owners cannot supply evidence, or the reviewer cannot accept the result.

A small review sample helps find what to investigate. It does not establish source quality or close-process performance for the whole organization. Use the [workflow discovery pack](../../templates/discovery-pack.md) and [data-readiness assessment](../../templates/data-readiness-assessment.md) before a target build.

## Give each part the right job

| Question | Route | Authority | If it fails |
| --- | --- | --- | --- |
| What are actual, plan, and variance? | Deterministic query and calculation over governed source revisions | Finance data and plan owners | Mark the packet unreconciled; do not draft a conclusion |
| Is the variance material? | Deterministic policy using the approved threshold and scope | Policy owner | Route for reviewer attention or hold for policy clarification |
| Why did it change? | Accountable owner supplies a structured explanation with source references | Cost-centre or operational owner | Mark explanation missing or unsupported |
| How should the evidence be written for review? | Model drafts a bounded commentary from the structured figures and cited explanation | Finance reviewer controls use and edits | Show the evidence summary or use the manual drafting path |
| May the commentary be distributed? | Existing finance review and distribution process | Authorized finance reviewer | Reject, revise, or hold |

The model never calculates a figure, selects a threshold, invents an explanation, changes a forecast, or sends the report. Calculations and policy decisions stay deterministic. The reviewer sees the source revisions, structured explanation, uncertainty, and exception state beside the draft.

## When the query runs and the total is wrong

The [data-analysis blueprint](../../blueprints/data-analysis-agent.md) already covers join explosion. In this fictional fixture's approved source `orders-report-v1`, order `ord-101` has a total of 10000 cents at one row per order. Its three lines contain 2000, 3000, and 5000 cents. The fixture defines the total as the sum of these complete line amounts, with no tax, discount, or status adjustment.

Joining the order to its lines returns these rows:

| order_id | line_id | order_total_cents | line_amount_cents |
| --- | --- | --- | --- |
| ord-101 | line-101-1 | 10000 | 2000 |
| ord-101 | line-101-2 | 10000 | 3000 |
| ord-101 | line-101-3 | 10000 | 5000 |

The query executes successfully. Summing `order_total_cents` across the joined rows yields `10000 + 10000 + 10000 = 30000` cents, while the approved one-row-per-order source reports 10000 cents. The eligible population still contains one order; three joined rows do not create three orders.

Calculate the parent total at the declared order grain, retaining each `order_id` once, then sum the parent amounts: `10000` cents. Summing the child amounts also gives `2000 + 3000 + 5000 = 10000` cents for this fixture, but that route requires confirmed line completeness and matching metric semantics. `SUM(DISTINCT order_total_cents)` is not a repair: two different orders can legitimately have the same total, and amount-level deduplication would discard one.

Compare the corrected result with the approved one-row-per-order report at the same source revision, population, currency, and time scope. Withhold the commentary while the totals disagree. Record the grain, keys, join cardinality, aggregation rule, and source authority in the [data-readiness assessment](../../templates/data-readiness-assessment.md) (`CTX-006`, `CTX-007`, `CTX-008`). These fictional rows supply no customer or production evidence.

## Review packet

For each variance, show:

- Period, entity or department, account, actual, approved plan, variance amount and percentage, calculation revision, and materiality-policy revision.
- The accountable owner’s explanation, its source references, time submitted, and any missing or conflicting evidence.
- A model-generated draft clearly labeled as a proposal, plus a deterministic evidence summary when the model route is unavailable or unsafe.
- Reviewer decision: approve, edit and approve, reject, request evidence, or defer; along with the reviewer, time, and reason.

The packet should remain read-only until the ordinary finance process authorizes a separate distribution step. A chat answer or copied paragraph is not an audit record.

## Evaluation before use

Use representative historical records only where access and retention permit. Hold out some records while refining the draft route. Test at least these conditions:

| Condition | Expected behavior |
| --- | --- |
| Actuals and plan reconcile; explanation is supported | Present a proposal with exact source references for reviewer decision |
| Actuals do not reconcile | Withhold the draft and flag the mismatch |
| Query succeeds but a parent-to-child join double-counts the total | Withhold the draft; correct the grain or confirmed child aggregation and reconcile to the approved source before resuming |
| Plan version is missing or stale | Withhold the draft and request the approved source |
| Explanation is absent, late, or conflicts with the evidence | Mark it unresolved; do not invent a narrative |
| Amount is below policy materiality | Apply the deterministic route and retain the policy reason |
| Model response fails or is malformed | Present the deterministic evidence summary and manual drafting path |
| Reviewer rejects the draft | Preserve the decision and reason for evaluation or workflow improvement; do not silently reuse it as truth |

Evaluate the complete packet, not writing style alone: source reconciliation, policy routing, attribution, reviewer correction burden, abstention, latency, cost, and handling of close deadlines. A good draft score cannot compensate for wrong figures or missing approval. Use the [evaluation guidance](../../library/04-production-evaluation-and-governance.md) and [intelligence-selection record](../../templates/intelligence-selection-record.md) to bind the claims and limits.

## What a results review should show

At the end of a bounded period, record the eligible population, measurement window, baseline, accepted and rejected packets, reviewer wait and correction load, exception volume, full cost, and known uncertainty. Use the [results walkthrough](../../templates/results-walkthrough.md) to distinguish a successful demonstration from observed adoption or an attributable business effect.

The next decision may be to continue the narrow review, redesign the packet, resolve a source-quality gap, extend the measurement period, or stop. It is not automatically a broader finance transformation.

## What this does not prove

This walkthrough does not prove that an organization’s ledger, plan, policy, explanations, approvals, controls, privacy posture, or close process are ready for automation. It does not provide accounting, audit, tax, or financial-reporting advice. A target workflow still needs its own source authority, permissions, retention, evaluation, release, operating ownership, and approval evidence. See [data readiness](../../library/16-data-readiness-and-context-contracts.md), [mechanism selection](../../library/12-software-architecture-and-intelligence-selection.md), and [production readiness](../../templates/production-service-readiness.md).
