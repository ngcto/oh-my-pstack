# Deepening

How to merge a cluster of shallow modules into one deep module without breaking its tests. Uses the vocabulary in [SKILL.md](../SKILL.md): module, interface, seam, adapter.

## Dependency categories

Classify what the cluster depends on. The category decides how the deepened module is tested across its seam.

1. **In-process.** Pure computation and in-memory state, no I/O. Always deepenable: merge the modules and test through the new interface directly. No adapter.
2. **Local-substitutable.** Dependencies with a local stand-in (an embedded Postgres, an in-memory filesystem). Deepenable when the stand-in exists. Run the stand-in in the test suite. The seam stays internal, with no port on the external interface.
3. **Remote but owned.** Your own services across a network (internal APIs, queues). Define a port at the seam. The deep module owns the logic and the transport is an injected adapter: HTTP or RPC in production, in-memory in tests. The logic lives in one module even though it deploys across a network.
4. **True external.** Third-party services you do not control. The deep module takes the dependency as an injected port, and tests supply a mock adapter.

## Seam discipline

- **One adapter is a hypothetical seam, two is a real one.** Introduce a port only when two adapters are justified, typically production and test. A single-adapter port is indirection.
- **Internal seams stay internal.** A deep module may have private seams. Tests reach them only through the interface, and they are never lifted onto the interface because tests like them. A seam that exists only for a test follows question 4 of [Tests Pay Rent](../../principle-tests-pay-rent/SKILL.md): move the test to the real boundary.

## Testing: replace, do not layer

- Unit tests on the old shallow modules become waste once tests exist at the deepened interface. Delete them. Layering the new suite on top of the old one preserves the coupling you just removed.
- Write the new tests at the deepened interface, which is the test surface.
- Assert observable outcomes through the interface, not internal state.
- Tests should survive internal refactors. If one has to change when the implementation changes, it tests past the interface. See [Tests Pay Rent](../../principle-tests-pay-rent/SKILL.md) for which tests earn their place.
