# Worked Value Case

This case separates what a review-only trial can measure from a forecast for a later authorized workflow. Every number is illustrative. None is a measured customer result.

## Decision event

The accounts-payable service owner decides whether to stop, reshape, or propose a review-only canary for the named segment. The finance controls manager verifies packet acceptance and control compliance. The committed fixture is a shadow candidate with zero traffic; it has not run this trial.

## What a review-only trial can measure

Track eligible exceptions, cases shown in the review queue, and usable packets. A packet is usable when an independent reviewer confirms that the source evidence and proposed disposition are correct without material correction. A correct no-action disposition counts if policy calls for it and the verifier confirms it. Rejecting an incorrect or unsupported packet does not count. Log corrections, rejections, and unresolved cases separately; keep them in the exposed denominator.

For a prospective trial, the illustrative thresholds are at least 60% eligible exposure, at least 80% independently usable packets among exposed cases, corrections or rejections below 20%, and at least five minutes less mean active reviewer handling time per comparable exposed case. Include time spent correcting or rejecting packets. Require zero prohibited or unverified effects and no new posting authority. Freeze the sample, baseline method, reviewer capacity, observation window, and cost ceiling before the trial. Hold if the sample or evidence is insufficient. Passing supports consideration of a review-only canary; production readiness and the receiving team's operating capability still have to pass separately.

## Forecast for a later authorized workflow

| Assumption | Illustrative value | How a target engagement would verify it |
| --- | ---: | --- |
| Eligible exceptions per month | 500 | Queue query with exclusions and deduplication |
| Eligible cases that reach the surface | 60% | Predeclared exposure event |
| Reached cases with an independently verified ledger correction | 80% | Authorized approval and source-of-truth readback that matches the approved change |
| Reviewer time saved per accepted case | 6 minutes | Matched time study against the current workflow |
| Loaded reviewer cost | $55/hour | Finance-approved labor basis |
| Delivery, assurance, support, and operating allocation | $850/month | Actual cost ledger, including additional handling and rework not already included in the time comparison |
| Variable model, tool, and compute cost | $0.50/reached case | Metered route and tool costs |

The forecast produces:

```text
reached cases = 500 × 60% = 300
verified ledger outcomes = 300 × 80% = 240
gross time value = 240 × 6/60 × $55 = $1,320/month
full monthly cost = $850 + (300 × $0.50) = $1,000/month
forecast net value = $1,320 - $1,000 = $320/month
forecast cost per accepted outcome = $1,000 / 240 = $4.17
```

The $320 is conditional net time value, not cash savings. A small miss in adoption, acceptance, reviewer effort, or support cost can erase it. No-action cases do not enter this ledger-correction denominator; their handling costs still count. A review-only packet cannot establish a verified ledger outcome or measure this margin.

## Graduation thresholds

Posting requires separate approval and release evidence. Before continuing or expanding that later workflow, the illustrative thresholds are at least 200 independently verified ledger outcomes in the agreed monthly equivalent, at least five minutes saved per verified correction, no more than $6 in full window cost per verified correction, and zero prohibited or unverified effects. The numerator includes costs of failed, rejected, and no-action cases. If no correction was verified, the ratio is unavailable and the value gate cannot pass.

Stop or reshape if the authority boundary changes, representative cases show material uncovered exceptions, the eligible population is below 350 per month, reviewer time does not improve, the cost ceiling is breached, or any unauthorized, duplicate, or unverified effect occurs.

## What is measured separately

- Forecast value versus demonstrated pilot evidence versus realized production value.
- Technical case pass rate versus operator acceptance and adoption.
- Runtime cost versus reviewer, support, incident, recovery, and allocated lifecycle cost.
- Time saved versus downstream rework or residual loss.

The current repository has only deterministic fixture evidence. Usable packets and reviewer effort have not been measured in a target trial. The ledger forecast remains unverified until the separately authorized workflow has evidence from live sources, eligible users, verified corrections, a time study, and full costs.
