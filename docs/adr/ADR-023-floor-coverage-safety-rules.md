---
id: ADR-023
title: Floor coverage never counts a lot twice, and doubtful exchanges need review
status: Accepted
date: 2026-11-13
decided: owner, 2026-11-13
---

# ADR-023 Floor coverage never counts a lot twice, and doubtful exchanges need review

## Context

Building floor coverage (SYS-112, SYS-113, SYS-115) showed cases the requirements did not settle, each of which could overstate readiness (HAZ-107, HAZ-114):

- An empty floor list would make "every floor item covered" true, and so "Go".
- One lot could count toward two floor items: the same product listed twice, or a lot accepted as an exchange for one item that is another item's own product.
- An accepted exchange could later lose its lot, or its lot could stop being eligible (for example after the arrival date moves), or it could be wrong: another medicine, the item's own product, or no valid amount entered. An exchange could also be recorded for an item no longer on the floor list.

## Options

- Empty floor list: "Go"; or "No go" with the reason.
- A lot counting twice: (a) both items need review until the clinician resolves it; (b) share the lot out automatically; (c) add duplicate targets together.
- An exchange whose lot is missing or ineligible: keep counting it until withdrawn; or stop counting it, with the reason.
- A wrong exchange: ignore it silently; or the item needs review.

## Decision

All by the owner on 2026-11-13, as Claude recommended:

- An empty floor list is "No go", with the reason.
- (a): both items need review, and the indicator is "No go", until the clinician merges the duplicate items or withdraws the exchange. Prepped never decides which item gets the stock.
- An exchange whose lot is missing or no longer eligible stops counting, with the reason shown.
- A wrong exchange makes the item need review, so the entry stays visible until the clinician corrects it; an exchange for an item not on the floor list means "No go" until it is checked.

## Consequences

- SYS-112, SYS-113, SYS-115, RC-107 and RC-114 reworded; tests under SYS-106, SYS-112, SYS-113 and SYS-115 in `packages/core/tests/prepped-floor.acceptance.test.ts`.
- More cases end in "needs review" and "No go" until a person acts; none can make "Go" appear sooner.
