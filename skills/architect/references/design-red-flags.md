# Design red flags

Screen every candidate before synthesis. A red flag is a reason to revise or reject the shape. Module shape is judged through the lens of the **small-door-big-room** principle skill: interface depth, seam placement, and the deletion test. The flags below stay in force. The next section adds the two checks that principle makes explicit.

## Module-shape lens (small-door-big-room)

Apply these to every module in the sketch, alongside the flags below.

- Interface depth. Count what a caller must know to use the module against the behavior it hides. A wide door into a small room fails.
- Seam placement. A seam (a point where behavior can be swapped or a boundary crossed) is justified by real variation or a real boundary: two adapters, a test substitute that cannot be avoided, an external system. A seam with one implementation and no boundary is speculative and should collapse into its caller.
- Deletion test. Imagine deleting the module. If its complexity reappears across many callers, it earns its keep. If the complexity vanishes or merely moves one hop, it was a pass-through or a wrapper and should go.

## Shallow module

A shallow module exposes a large interface while hiding little complexity. Judge depth by the capability and policy hidden behind the public surface relative to the size of that surface. Prefer a simple interface backed by substantial behavior.

Do not confuse a deep module with a deep call chain. A deep call chain scatters understanding across layers. A deep module concentrates capability behind one interface.

Look for these signs:

- Callers coordinate several methods to complete one operation.
- Public options expose internal stages or implementation choices.
- Learning the interface does not save the caller from learning the implementation.

## Information leakage

Information leakage makes multiple modules depend on the same internal decision. A representation, policy, or protocol detail appears in more than one place, so changing it requires coordinated edits.

Public re-exports of transport or wire types are leakage. Parse external data into domain types behind the interface. Keep storage schemas, framework objects, and protocol details private.

## Temporal decomposition

Temporal decomposition organizes modules by execution order instead of the knowledge they own. Separate load, validate, transform, and save stages often repeat one representation and its invariants across several boundaries.

Group code around domain knowledge and ownership. Methods that run at different times can still belong to one module when they protect the same decisions.

## Pass-through method

A pass-through method forwards the same arguments to another method with the same shape. It adds a layer without hiding complexity.

Remove it or move responsibility to the module that can complete the operation. Keep a forwarding boundary only when it adds policy, adaptation, or a distinct abstraction.
