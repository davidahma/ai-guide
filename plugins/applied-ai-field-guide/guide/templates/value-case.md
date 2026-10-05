# Value Case

## Outcome contract

The referenced `workflow-charter.json` is authoritative for shared workflow, segment, owner, outcome, verifier, baseline, target, attribution, and guardrail fields. Record a charter change there first, then synchronize this planning model and update the timestamp below. `illustrative_fixture` is reserved for the repository's canonical JSON example and must be replaced with `unmeasured`, `estimated`, or `measured` in an engagement artifact.

| Field | Value |
| --- | --- |
| Workflow-charter URI | — |
| Workflow-charter version | — |
| Last synchronized at | — |
| Workflow and eligible segment | — |
| Operational owner | — |
| Accepted outcome | — |
| Independent verifier | — |
| Primary metric and direction | — |
| Baseline status: unmeasured, estimated, or measured | — |
| Baseline value, date, source, and denominator | — |
| Target and measurement window | — |
| Attribution method | — |
| Guardrail metrics | — |

## Assumption model

| Input | Low | Expected | High | Evidence and owner |
| --- | ---: | ---: | ---: | --- |
| Annual eligible volume | — | — | — | — |
| Adoption rate | — | — | — | — |
| Accepted-outcome uplift | — | — | — | — |
| Value per accepted outcome | — | — | — | — |
| Annual avoided loss | — | — | — | — |
| Annual expected residual loss not already netted from unit value or avoided loss | — | — | — | — |
| One-time implementation and change cost | — | — | — | — |
| Annual fixed operating cost | — | — | — | — |
| Variable model, tool, compute, storage, retry, and wait cost per eligible run | — | — | — | — |
| Human review and recovery cost per eligible run | — | — | — | — |

```text
annual_gross_realized_value =
  eligible_volume
  × measured_adoption_rate
  × accepted_outcome_uplift
  × value_per_accepted_outcome
  + measured_avoided_loss

annual_net_value_before_system_cost =
  annual_gross_realized_value
  - residual_loss_adjustment

residual_loss_adjustment =
  0 when the exposure is already netted from unit value or avoided loss
  otherwise separately attributed residual or incremental harm

annual_variable_cost =
  eligible_runs
  × (variable_system_cost_per_eligible_run
     + human_review_and_recovery_cost_per_eligible_run)

steady_state_annual_net_value =
  annual_net_value_before_system_cost
  - annual_variable_cost
  - annual_fixed_operating_cost

year_one_net_value =
  steady_state_annual_net_value
  - one_time_implementation_and_change_cost

payback_months =
  one_time_implementation_and_change_cost
  / positive_steady_state_monthly_net_value
```

Do not calculate payback when steady-state monthly net value is zero or negative. Avoided loss is a measured reduction from the baseline; subtract residual loss separately only when it represents harm not already netted from avoided loss or unit value. For one loss class, use either gross exposure minus residual loss or net avoided loss—never both. If residual loss is unmeasured, keep it `null`, lower confidence, and do not claim a complete net-value result. Keep one-time, fixed, variable-system, and human-review/recovery costs mutually exclusive and state the currency, period, and allocation method.

## Benefit realization

Record what happens to released time after new review, exception, support, and recovery work is included. A shorter task can release capacity while payroll and output stay unchanged.

| Benefit type | Evidence for the declared population and period | Monetary treatment |
| --- | --- | --- |
| Reduced expenditure | An attributable reduction in paid overtime, contractor, vendor, or other expense, confirmed by the accountable owner | Count the observed reduction; keep future reductions as a forecast. |
| Avoided cost | Demonstrated demand and a credible counterfactual spending plan, such as hiring that would otherwise have been needed | Keep planned avoidance as a forecast until the period and counterfactual support the claim. An unfilled vacancy alone does not prove savings. |
| Additional accepted work | Incremental completed work with independent acceptance, demand, attribution, and value evidence | Use incremental contribution or another owner-approved unit value; do not substitute gross revenue for contribution. |
| Available capacity | Measured net time released, its owner, and its intended and observed use | Report hours as a non-cash operating result. Unused time or time multiplied by salary alone does not establish a monetary benefit. |

| Benefit ID and type | Baseline / counterfactual | Intended and observed use | Amount or hours, currency, and period | Evidence status and source | Owner and verifier | Overlap exclusion and value-model term |
| --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | Unmeasured / estimated / measured | — | — |

Do not count the same released time as both labor savings and additional output. Separate distinct benefits with their evidence and exclusions, including costs already accounted for in the cost comparison. Map monetary rows into `value_per_accepted_outcome` or the applicable avoided-loss term once; do not add a second benefit total to the equation above. Where a benefit does not fit the equation, document an owner-approved economic model and reconcile it with the charter rather than forcing it into accepted-outcome uplift or avoided loss. Keep capacity hours separate, and label annualized projections as estimates when the full period has not been observed. `VAL-002`.

## Evidence gates

| Gate | Evidence | Threshold | Owner | Status |
| --- | --- | --- | --- | --- |
| Problem materiality | Current-state baseline | — | Operational | — |
| Technical feasibility | Representative replay and effect verification | — | Technical | — |
| Operator acceptance | Reviewed cases and usability evidence | — | Product/operations | — |
| Adoption | Eligible use, completion, override, abandonment | — | Operational | — |
| Business value | Attributed accepted-outcome movement | — | Metric owner | — |
| Economics | Full cost per accepted outcome and payback | — | Sponsor/finance | — |
| Production readiness | Release, support, recovery, ownership | — | Service/risk | — |

## Sensitivity and disconfirming evidence

| Assumption | Result if wrong | Earliest signal | Stop or redesign threshold |
| --- | --- | --- | --- |
| — | — | — | — |

## Decision

Record `discover`, `pilot`, `defer`, `do_not_build`, `promote`, `pause`, or `retire`, with the evidence date, approvers, limitations, and next review.
