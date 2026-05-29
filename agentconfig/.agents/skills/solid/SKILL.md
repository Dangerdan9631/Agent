---
name: solid
description: 'Full SOLID rules for maintainable object design and dependency control. Use when splitting responsibilities, designing abstractions, reviewing polymorphism, decoupling dependencies.'
argument-hint: 'Describe the task, target files, and the design or maintainability concern you want addressed.'
user-invocable: true
---

# OBEY SOLID Principles

## Purpose

This repository follows **SOLID** as a practical set of design rules for maintainable code:
use focused responsibilities, stable abstractions, substitutable implementations, narrow interfaces, and inward-facing dependencies.

All code generation, edits, and reviews must optimize for:
- cohesive modules and classes
- extensibility without brittle modification
- substitutable implementations
- interfaces that match real client needs
- dependencies aimed at stable abstractions
- low coupling and high clarity

This file is a binding engineering policy: `MUST` is binding, `SHOULD` is a strong default, and `MUST NOT` is forbidden.

---

## Primary Directive

When uncertain, choose the design that:
1. gives each unit one clear reason to change
2. keeps new behavior additive instead of invasive
3. allows implementations to be swapped safely
4. exposes only the methods each client actually needs
5. points dependencies toward stable policy rather than volatile detail

Do not use SOLID as permission to add layers, interfaces, or abstractions that do not reduce real change cost.

---

## SOLID Means Practical Design

SOLID in this repository does **not** mean:
- making an interface for every class
- splitting every method into a separate type
- using inheritance because a principle mentions substitution
- adding indirection before there is real variability
- preferring pattern vocabulary over readable code

SOLID in this repository **does** mean:
- keeping responsibilities focused
- keeping dependencies intentional
- making extension safer than modification when variability is real
- designing contracts that are easy to implement correctly
- keeping clients independent from methods they do not use
- making high-level policy independent from low-level details

---

## Single Responsibility Principle

### Core Rule
A module, class, or function should have one primary reason to change.

### Required Behavior
1. Group behavior that changes for the same actor or policy reason.
2. Split units that mix domain logic, persistence, transport, formatting, and orchestration.
3. Keep public APIs centered on one coherent concept.
4. Let names reveal the single responsibility.

### Good Signs
- a type can be described in one sentence without using "and"
- tests for the unit center on one concern
- most edits to the unit come from the same kind of requirement

### Smells
- a class changes for UI, persistence, and business logic at once
- one module owns parsing, validation, storage, and presentation
- one service class becomes the default place for unrelated logic

### Anti-patterns (MUST NOT)
- god objects
- kitchen-sink services
- utility modules that silently accumulate unrelated responsibilities

---

## Open-Closed Principle

### Core Rule
Software entities should be open for extension and closed for destabilizing modification.

### Required Behavior
1. Identify the axis of likely variation before creating an extension point.
2. Prefer adding a new implementation over editing many conditional branches when variation is stable and recurring.
3. Protect stable policy from repeated mechanical edits.
4. Keep extension seams explicit and narrow.

### Good Signs
- adding a new case usually means adding one new type or one new table entry
- existing tested behavior remains untouched when new variants arrive
- extension points are owned by the policy that needs them

### Smells
- every new variant edits the same `switch` in several places
- adding support for one behavior forces unrelated code changes
- extension requires modifying core modules with each new case

### Anti-patterns (MUST NOT)
- speculative extension points with no real variation yet
- plugin systems for one concrete implementation
- abstracting unstable code before the variation is understood

---

## Liskov Substitution Principle

### Core Rule
Subtypes and alternate implementations must preserve the expectations of their clients.

### Required Behavior
1. Preserve the semantic contract of the base type or interface.
2. Do not strengthen preconditions for subtypes.
3. Do not weaken guarantees callers rely on.
4. Keep side effects, mutability, and error behavior compatible with the contract.
5. Use composition instead of inheritance when true substitutability is doubtful.

### Good Signs
- callers do not need `instanceof`, type checks, or caveats to use implementations safely
- test suites for the shared contract pass across implementations
- method names and return behavior mean the same thing for all implementations

### Smells
- subclasses throw "not supported" for inherited behavior
- one implementation silently changes ordering, mutability, units, or nullability assumptions
- callers must special-case one subtype to stay correct

### Anti-patterns (MUST NOT)
- inheritance used only for code reuse when the subtype is not truly a subtype
- base types that promise more than some implementations can honor
- overrides that surprise callers about timing, effects, or failure semantics

---

## Interface Segregation Principle

### Core Rule
Clients should not depend on methods they do not use.

### Required Behavior
1. Design interfaces around client roles, not around implementation convenience.
2. Split broad interfaces when different consumers use disjoint method sets.
3. Keep optional capabilities separate from required capabilities.
4. Prefer smaller, behavior-focused interfaces over one omnibus interface.

### Good Signs
- most clients use most of the methods on the interface they depend on
- mocks, fakes, and adapters stay small
- interface names describe a role or capability clearly

### Smells
- implementations must stub unrelated methods
- tests need large fake objects to satisfy a tiny dependency
- one interface mixes read, write, admin, and lifecycle concerns

### Anti-patterns (MUST NOT)
- "manager" or "service" interfaces that expose every operation in one place
- public interfaces shaped by a concrete implementation's internal organization
- forcing read-only clients to depend on write operations

---

## Dependency Inversion Principle

### Core Rule
High-level policy should not depend on low-level details. Both should depend on stable abstractions.

### Required Behavior
1. Define abstractions from the consuming policy's needs.
2. Keep framework, I/O, database, network, and vendor details behind boundaries.
3. Let outer layers implement interfaces owned by inner policy where appropriate.
4. Keep construction and wiring out of domain and use-case logic.

### Good Signs
- core logic can run with fakes instead of real infrastructure
- business code does not import transport or storage libraries directly
- implementation details can be swapped without rewriting policy code

### Smells
- application logic imports ORM entities, HTTP requests, SDK clients, or filesystem calls directly
- core code constructs concrete infrastructure classes inline
- testing high-level behavior requires a full runtime stack

### Anti-patterns (MUST NOT)
- infrastructure-owned interfaces consumed by policy code without reason
- dependency injection used only as ceremony while policy still knows implementation details
- shared abstractions that belong to nobody and exist only to satisfy layering fashion

---

## How the Principles Work Together

1. Use SRP to find the right unit of change.
2. Use OCP to protect stable code from recurring modification.
3. Use LSP to keep abstractions honest.
4. Use ISP to keep client dependencies narrow.
5. Use DIP to keep policy independent from detail.

If applying one principle harms another, prefer the design that lowers total complexity and change cost.

---

## Class and Module Design Rules

1. A class or module should communicate one concept clearly.
2. Favor composition when multiple behaviors must vary independently.
3. Keep inheritance shallow and purposeful.
4. Avoid deep hierarchies when roles or policies can be composed.
5. Separate orchestration from calculation and state management.

---

## Interface and Contract Rules

1. Every interface must justify its existence with either multiple implementations, a real boundary, or clearer client-facing design.
2. Name interfaces by role or capability, not by generic technical status.
3. Keep method semantics explicit: return meaning, nullability, ownership, ordering, and error behavior must be stable.
4. Prefer one narrow abstraction per client role over a single general abstraction for everyone.

---

## Inheritance Rules

1. Use inheritance only when the subtype relationship is semantically true.
2. Do not inherit merely to share code.
3. Prefer delegation when reused behavior does not imply substitutability.
4. Keep base types minimal and stable.
5. Avoid protected-state coupling that makes subclasses fragile.

---

## Composition Rules

1. Prefer composition when behavior varies by policy, algorithm, external dependency, or runtime configuration.
2. Compose small roles instead of building one monolithic inheritance tree.
3. Keep collaboration explicit and easy to reason about.
4. Use composition to decouple features that change at different rates.

---

## Conditional vs Polymorphism Rules

1. A small honest conditional is acceptable.
2. Repeated branching across many sites is a signal to consider polymorphism, tables, or a strategy object.
3. Do not replace one local conditional with a hierarchy that adds more complexity than it removes.
4. Choose polymorphism only when the variation is stable, meaningful, and owned by a real abstraction.

---

## Testing Rules for SOLID Design

1. Test contracts shared by multiple implementations.
2. Test policy without real infrastructure where DIP is intended.
3. Test that narrow interfaces are sufficient for their clients.
4. Test that alternate implementations preserve the same behavioral guarantees.
5. Use tests to detect responsibility leakage across boundaries.

---

## Refactoring Rules

When improving existing code:

1. Split units with mixed responsibilities.
2. Introduce interfaces only where they reduce coupling or stabilize a boundary.
3. Replace inheritance with composition when substitution is weak.
4. Break large interfaces into client-shaped roles.
5. Move infrastructure dependencies out of high-level policy.
6. Stop when the design is clearly easier to change; do not keep abstracting for sport.

---

## Code Generation Rules

When generating code, default to this order:
1. identify the responsibility boundary
2. identify the likely axis of variation
3. decide whether variability needs composition, a narrow interface, or no abstraction yet
4. ensure callers can rely on one stable contract
5. keep details behind policy-facing boundaries

Default choices:
- one behavior, one implementation, no real boundary -> no interface yet
- several interchangeable behaviors -> role-focused interface plus composition
- framework or infrastructure boundary -> policy-owned abstraction plus adapter
- reused code without true subtype semantics -> composition, not inheritance

---

## Review Rules

When reviewing code, actively look for:
- mixed responsibilities in one module
- recurring edits to the same conditional dispatch logic
- subtype-specific caveats that break substitution
- broad interfaces with many unused methods
- high-level logic importing low-level details
- interfaces or classes that exist only as ceremony
- inheritance trees built for reuse rather than meaning

---

## Forbidden Patterns

### SOLID Theater
- adding interfaces with one implementation and no boundary value
- splitting code into many tiny classes that obscure the domain
- citing a principle to justify accidental complexity

### False Subtyping
- subclasses that narrow valid inputs
- subclasses that change core meaning of inherited methods
- inheritance used only to avoid duplication

### Omnibus Interfaces
- single interfaces for read, write, admin, reporting, and lifecycle control
- mocks or fakes forced to implement unrelated methods

### Detail Leakage
- use cases importing HTTP, ORM, filesystem, or SDK concerns directly
- domain code constructing concrete adapters inline

---

## Review Checklist

Before finalizing any change, verify:
- Does each touched unit have one primary reason to change?
- Did we add extension without destabilizing existing code where variation is real?
- Can implementations be substituted without caller caveats?
- Are clients depending only on methods they actually need?
- Do high-level policies depend on abstractions rather than volatile details?
- Did we avoid unnecessary interfaces, layers, or hierarchies?

If any answer is no, revise before shipping.

---

## Final Instruction

When uncertain, prefer the design that:
1. narrows responsibility
2. stabilizes contracts
3. keeps implementations substitutable
4. keeps client dependencies small
5. keeps policy independent from detail

Use SOLID to reduce change cost, not to manufacture abstraction.