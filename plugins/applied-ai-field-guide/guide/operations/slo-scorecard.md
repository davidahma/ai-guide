# Production AI System SLO Scorecard

| SLI | Example objective | Error budget policy |
| --- | --- | --- |
| Accepted outcome rate | `>= 98.5% / 28d` | Pause promotion below objective |
| Eligible workflow completion | `>= target / 28d` | Investigate adoption and workflow friction |
| Override or abandonment rate | `<= segment threshold / 28d` | Review evidence quality, UX, and workflow fit |
| Unauthorized effect rate | `= 0` | Immediate kill switch |
| Cross-tenant effect rate | `= 0` | SEV-0 |
| Duplicate effect rate | `= 0` | Disable affected write tool |
| Postcondition failure rate | `<= 0.1% / 28d` | Freeze writes at fast burn |
| P95 full-case cycle time | `<= 90 s` | Diagnose the delay; apply the segment's response |
| Full window cost per accepted outcome | `<= $0.40` | Review the route or pause promotion |
| Context freshness breach | `<= 0.5%` | Disable affected source segment |
| Human approval P95 wait | `<= 4 h` | Capacity/escalation routing |
| Recovery success rate | `>= 99.9%` | Block autonomy expansion |
| Trace completeness | `= 100%` for writes | Block write path |

The numbers above illustrate separate objectives; they need not describe the same segment. In particular, an approval route with an hours-long wait may need a different cycle-time objective from a route without human approval. Bind each objective to a named segment, owner, measurement window, and release or rollback decision. Track the business outcome and realized value separately in the [production service review](../templates/production-service-review.md).

## Measure the whole case

Define the cohort by case arrival and use stable case identity to count verified outcomes once. Track the number, disposition, and cost of all attempts separately. See the [reconciliation rules](telemetry-contract.md#reconcile-cases-attempts-and-observations). For each case, measure elapsed time from admission to the declared terminal disposition, including queueing, retries, dependency waits, and human approval. Count timeouts, cancellations, and escalations in the cohort and report their dispositions separately; a fast failure does not satisfy the accepted-outcome objective. Report open cases and their elapsed time as of the cutoff. If an open case has crossed the objective's deadline, count it as over the deadline; if the observation is too early or incomplete to establish the objective, report the gap and hold promotion. Do not report a percentile of completed cases as if it covered the whole cohort.

Compute P95 from the full per-case durations when available. Do not add stage percentiles. For example, in 100 cases, suppose queueing and execution each take 10 seconds except for four slow queue cases and four different slow execution cases, where the affected stage takes 100 seconds. Each stage's P95 is 10 seconds, but the full-case P95 is 110 seconds because eight cases were slow. Stage percentiles help locate a delay; they cannot verify the end-to-end objective.

Divide all attributed spend in the mature cohort and measurement window by the independently accepted outcomes in that same scope. Include failed and abandoned work, retries, review, infrastructure, and allocated support and recovery costs under the declared accounting rule. With zero accepted outcomes, the ratio is unavailable, not zero. Keep tail cost (for example, P95 cost per case) and the enforced per-run budget separate from the window ratio. `CST-001`, `CST-002`.

## Burn-rate actions

Configure burn-rate alerts per SLO and derive thresholds from that objective's period, error budget, and allowed budget consumption. Require both the long and short window to exceed the same threshold, plus a minimum eligible-event or traffic condition, before alerting. Single-window spikes are diagnostic signals, not sufficient evidence for an automatic production action. The [Google SRE multiwindow pattern](https://sre.google/workbook/alerting-on-slos/) is a useful starting point; tune it against local traffic and consequence.

| Alert class | Long window | Confirming window | Action |
| --- | --- | --- | --- |
| Fast burn | 1 h | 5 min | Page on-call; freeze promotion; invoke only preauthorized containment for the affected segment |
| Sustained burn | 6 h | 30 min | Page on-call; constrain the affected route after diagnosis |
| Slow burn | 3 d | 6 h | Open owned corrective work and review the objective or dependency |

Automatic kill switches remain appropriate for declared zero-tolerance invariants such as unauthorized or cross-tenant effects. Reliability, latency, adoption, and cost SLOs use the predeclared response for that service; they do not inherit a generic kill policy.

## Capacity constraints

```text
runs_per_window = min(
  workflow_start_budget_per_window,
  tool_calls_budget_per_window / p95_tool_calls_per_run,
  provider_tokens_budget_per_window / p95_tokens_per_run,
  reviewer_approvals_per_window / p95_approvals_per_run,
  cost_budget_per_window / p95_cost_per_run
)

effective_concurrency = min(
  workflow_worker_slots,
  dependency_in_flight_limit,
  ceil(runs_per_window * p95_active_run_seconds / window_seconds)
)
```

All terms in `runs_per_window` use the same measurement window. Set effective concurrency to `0` when planned runs are `0`; otherwise the ceiling keeps positive low-volume demand from rounding down to zero. If a workflow does not require approval, omit the reviewer term rather than dividing by zero. Validate the estimate with observed queue, service-time, burst, and dependency-saturation data before changing concurrency.

## Recovery objectives

| State class | RPO | RTO | Restore verification |
| --- | --- | --- | --- |
| Ephemeral context | Not applicable; context is not durable | New run | Start a new run and rebuild from source revisions |
| Durable workflow checkpoint | Last verified transition | 15 min | Deterministic replay |
| Staged proposal | Last committed stage | 30 min | Digest and policy recheck |
| External effect receipt | `0` loss | 15 min | Source-of-truth reconciliation |
| Audit record | Policy-defined | 4 h | Hash chain / storage integrity |

Use [behavior monitoring](behavior-monitoring.md) to interpret intent, action, effect, and outcome signals together, and [change management](change-management.md) to bind every behavioral change to canary and rollback evidence.
