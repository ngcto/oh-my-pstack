---
name: principle-tests-pay-rent
description: "Apply when writing, changing, reviewing, or auditing tests, or when a suite feels bloated, duplicated, or coupled to internals. Gate every test on the behavior it protects, the regression that fails it, and why nothing else already covers it; prune tests and test-only seams that do not earn their place."
disable-model-invocation: true
---

# Tests Pay Rent

A test is a tenant. It occupies CI time, review attention, and refactor friction, and it pays in confidence: it fails when a real defect ships. A test that cannot fail for a defect, or that fails on every harmless rewrite, is a tenant that does not pay. Evict it.

This principle decides whether a test earns its place and where it lives. [Test Behavior, Not Implementation](../principle-test-behavior-not-implementation/SKILL.md) decides how a kept test asserts. Run both.

**Why:** Suites rot by accretion. Each test looks harmless alone, so nobody deletes one, and the pile makes refactors expensive while catching nothing new. Gating at write time is cheap. Pruning later is a campaign.

**The authoring gate.** Before adding a test, answer four questions. A missing answer means do not add it yet.

1. What observable behavior, invariant, or independent contract does it protect?
2. What credible regression makes it fail?
3. Why does existing coverage not already catch that failure? Each contract has one primary owner at the strongest boundary. A second layer needs its own distinct risk, such as a transport or lifecycle failure the owner cannot reach. Extend a table case or shared fixture before writing a near-duplicate.
4. Does it demand a production seam (export, flag, wrapper, injection hook) that no real caller needs? If yes, move the test to the real boundary.

**Junk patterns.** A match fails the gate unless the retention bar names the contract it independently guards.

- Assertion-free coverage probes, and self-comparisons or identity copiers.
- Copied fixtures, inventories, manifests, or export lists.
- Exact source, import, or string greps.
- Private predicate or call-shape tests that the real boundary already covers.
- The same contract invoked twice, or a shared helper replayed per provider.
- Tests whose only job is to keep a test-only export, global, or wrapper alive, and production code whose only callers are tests.
- Expected values produced by the helper or renderer under test.
- A mock that implements the asserted behavior, or one identical mock standing in for different APIs.
- Fixtures that hand over the ordering, receipt, or callback the owner should produce, or persistence asserted against a store the path never writes.
- Capability tests that restate declared flags instead of exercising what the flag promises.
- Negative controls that pass for an unrelated reason, such as a denial from a different guard.
- Names that promise more than the input exercises: a "retires the window" test that asserts the window was not cleared.

**Retention bar.** Keep a test that independently enforces a public API, plugin SDK, protocol, config default, migration, storage, security, platform, prompt-byte, generated cross-language, package, release, or architecture contract. Also keep call ordering when order is observable, regressions with a credible failure mode, and source inspection when it is the cheapest guard: it fails when the user-facing key, byte, or path changes and survives an identifier-only rename. Static or slow is not a reason to delete. A retained test that fails on the baseline is a possible product bug: reproduce it and repair the owner.

**Regressions.** A bug test must fail on the pre-fix code for the intended reason and pass after the owner-level repair. One that never demonstrably failed proves the mock, not the fix. Write one regression at the owner boundary. Do not replay it at every layer the bug crosses.

**Refactor check.** A behavior-preserving refactor must not break a test. If one does, the test asserted implementation. Rewrite it at the owning boundary before landing it. When auditing, such a test is suspect, not automatically deletable.

**Red flags:** a suite that grows with every bug and never shrinks, exports added "for tests", three layers asserting the same scenario, deletions resisted because "it's just a test".

To audit an existing suite or prune a whole subsystem, read [references/audit-sweeps.md](references/audit-sweeps.md).

See also [Small Door, Big Room](../principle-small-door-big-room/SKILL.md): tests cross the same seam callers do.
