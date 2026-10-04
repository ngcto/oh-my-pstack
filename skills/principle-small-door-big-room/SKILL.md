---
name: principle-small-door-big-room
description: "Apply when designing or restructuring a module, choosing where a seam goes, or when code is shallow, pass-through heavy, hard to test, or hard to navigate. Build deep modules: a lot of behavior behind a small interface, tested through that interface."
disable-model-invocation: true
---

# Small Door, Big Room

Design deep modules: a lot of behavior behind a small interface, placed at a clean seam, tested through that interface. The door is small, the room behind it is big. Callers gain leverage, maintainers gain locality.

**Why:** A shallow module makes the reader learn an interface about as large as its body, so it buys nothing. Callers each re-derive the same knowledge, bugs scatter, and tests pin internals. Depth concentrates all three costs in one place.

**Vocabulary.** Use these words exactly. Consistent language is the point.

- **Module:** anything with an interface and an implementation, at any scale: function, class, package, slice. Avoid unit, component, service.
- **Interface:** everything a caller must know to use the module correctly: signature, invariants, ordering, error modes, required config, performance traits. Avoid API and signature, which name only the type-level surface.
- **Implementation:** the code inside. Say adapter when the seam is the topic, implementation otherwise.
- **Depth:** leverage at the interface, the behavior a caller or test exercises per unit of interface learned. Deep: much behavior, small interface. Shallow: interface nearly as complex as the body.
- **Seam:** a place where behavior can change without editing in that place, and where a module's interface lives. Where it goes is its own decision, separate from what sits behind it. Avoid boundary.
- **Adapter:** a concrete thing that satisfies the interface at a seam. It names a role, not a size.
- **Leverage:** what callers get. One implementation pays back across N call sites and M tests.
- **Locality:** what maintainers get. Change, bugs, and knowledge concentrate in one place. Fix once, fixed everywhere.

**Rules.**

- **Deletion test.** Imagine deleting the module. If the complexity vanishes, it was a pass-through. If it reappears across N callers, the module earned its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. Wanting to test past the interface means the module has the wrong shape.
- **One adapter is a hypothetical seam, two is a real one.** Add a seam only where something actually varies across it. Production plus a test fake counts as two.
- **Depth belongs to the interface, not the implementation.** A deep module may be built from small swappable parts. Those are internal seams: private, exercised only through the interface, never exposed. A seam that exists only so a test can reach it follows question 4 of [Tests Pay Rent](../principle-tests-pay-rent/SKILL.md): move the test to the real boundary.

**Shape it for tests.** Accept dependencies instead of creating them (`processOrder(order, gateway)`, not `new StripeGateway()` inside). Return results instead of mutating (`calculateDiscount(cart): Discount`). Keep the surface small: fewer methods mean fewer tests, fewer parameters mean simpler setup.

**Rejected framings.**

- Depth as implementation lines over interface lines. It rewards padding. Measure leverage.
- Interface as the `interface` keyword or a class's public methods. It covers every fact a caller needs.
- Boundary as a design term. It collides with bounded context. Say seam or interface.

**Neighbors.**

- [Model the Domain](../principle-model-the-domain/SKILL.md) picks the structure that goes behind the door. This principle sizes the door.
- [Minimize Reader Load](../principle-minimize-reader-load/SKILL.md) counts layers. Depth is the test for which layers to keep: a layer that fails the deletion test goes.
- [Laziness Protocol](../principle-laziness-protocol/SKILL.md): a flat call tree and a rich interface agree. Hide work behind one call, not behind five.
- [Boundary Discipline](../principle-boundary-discipline/SKILL.md): guards sit at the system edge, so the inside of a deep module can trust its types.
- [Tests Pay Rent](../principle-tests-pay-rent/SKILL.md): tests cross the same seam as callers, so one owner suite per interface is enough.

**Red flags:** a wrapper with one caller, a port with one adapter, a getter or reset export that exists for tests, callers that must know call order the module could enforce, a change that touches five files for one decision.

To deepen a cluster of shallow modules, read [references/deepening.md](references/deepening.md). When the right interface is unclear, read [references/design-it-twice.md](references/design-it-twice.md).
