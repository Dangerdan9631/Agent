## Coding Conventions

### Object Oriented Design

This project should follow object oriented programming and SOLID principles.
Only use classes and interfaces instead of top level functions.

- **Single Responsibility**: Model behavior with small classes that have one
  clear reason to change. Avoid static utility collections and top level
  function dumping grounds for business behavior; if shared behavior is
  needed, name the concept and model it as a focused type.
- **Open/Closed**: Design types so new behavior can be added with a new
  implementation rather than by editing existing classes or branching logic.
  Do not add extension points speculatively before the variation is real.
- **Liskov Substitution**: Alternate implementations of an interface must
  honor the same contract; do not strengthen preconditions, weaken
  guarantees, or throw "not supported" for inherited behavior.
- **Interface Segregation**: Prefer explicit, narrow interface contracts
  shaped by client needs over reaching into another class's representation
  or depending on concrete implementation details.
- **Dependency Inversion**: Depend on interfaces at boundaries and inject
  implementations through constructors or explicit composition roots. Keep
  concrete framework, persistence, filesystem, network, and vendor types
  behind local interfaces or adapters.
- Keep constructors simple. Construction should wire dependencies, not perform
  validation, I/O, or business work.

### File Structure

- Each file should contain one top level export.
  - Additional module level types are allowed.
  - Additional exports can be used when they are inherently coupled to the top
    level export (e.g. a type used as input to a function).
  - Top level constants can be grouped into a single file when they are related
    (e.g. multiple constants all related to configuration paths).
- Do not use barrel files, and do not re-export types. Types can be re-exported
  from a library's index file when they are a part of the library's public API.
- Use path aliases for package local file imports. Use subpath exports to
  provide namespaced imports from a library.
- Organize files in subdirectores based on architectural layer, then by domain.
  folders should only contain child folders or code files. Mixed folders should
  be rare and only used for things like index files that don't contain app
  logic.
  - Layers should be logical and avoid cyclic dependencies between layers.
  - Domains should generally be centered around related functionality or domain
    entities. Domains should generally depend on types in the same domain in
    other layers, and cyclic dependencies between domains should be rare.

### Logging

- Route all diagnostic output, warnings, and errors through the project's
  logging framework (`tslog`). Application and library code must never call
  `console.*` directly.
- A dedicated user-facing output boundary (an interface with exactly one
  adapter implementation, e.g. a `RuntimeOutputWriter`) may write to
  stdout/stderr because it is the program's designed output contract rather
  than diagnostic logging. Keep such adapters narrow, use them only for that
  contract, and never use them to report errors or diagnostics.
- Inject loggers through constructors like any other dependency instead of
  constructing ad hoc loggers deep inside business logic.
- Application logic must log the important decisions it makes and the
  configuration values that drove them (e.g. resolved paths, selected
  implementations, feature flags) so behavior can be understood from logs
  alone.

### Doc Comments

Add doc comments to all top level classes, interfaces, types, and values. All
schema fields should also have doc comments.

- Doc comments should be 1-2 plain english sentences.
- Doc comments look inward. They should not explain how the code is used by
  other parts of the app, but should explain the intent of the code and how it
  should be used.
- Parameter and field comments should include details on constraints and form.
- All non-void return types should have a comment describing the return value.
- Always use the multiline format. Never put the comment on a single line, even
  if it is short.

Example:

```ts
/**
 * Checks if a file path is executable to prevent attempting to run non-executable
 * files which would cause spawn failures.
 *
 * @param filePath - Absolute or relative path to check. Must be a non-empty string.
 * @returns true if the file exists and has execute permissions, false otherwise.
 */
export function isExecutable(filePath: string): boolean {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
```

### README.md

Each `src/` subdirectory should have a `README.md` with a high level
overview of the purpose, conventions, and contents of the directory.
[README.template.md](.docs\README.template.md) includes the format and
conventions for these files. Refer to that when making edits to them.

When creating or modifying files in a directory, reference that directory's `README.md` to understand the purpose and conventions of the files in it.

### OBEY Clean Code by Robert C. Martin

#### Primary bias to correct

Working code is not automatically clean code.

#### Decision rules

- Treat cleanliness as part of delivery. Preserve behavior, leave touched code
  cleaner within scope, and do not add mess.
- Treat versions before `1.0.0` as pre-release. Breaking changes are acceptable
  when they produce the right application API; do not add backwards
  compatibility scaffolding for pre-1.0 behavior unless needed to protect
  user-authored data.
- Keep functions small, focused, and at one level of abstraction. Tell the story
  top-down so intent appears before detail.
- Keep parameters few and meaningful. Avoid boolean flags, output parameters,
  and grab-bag argument lists; model the concept instead.
- Keep the happy path readable. Isolate error handling, invalid-state handling,
  and cleanup.
- Expose behavior rather than raw representation. Avoid train-wreck access,
  utility dumping grounds, and classes or modules with mixed responsibilities.
- Keep construction, framework, persistence, transaction, security, and vendor
  details outside business behavior.
- Make public APIs small, explicit, and hard to misuse. Encode boundary logic,
  required order, and likely changes where readers can see them.
- Use comments only for rationale, constraints, warnings, or external contracts.
  Do not narrate code or explain a specific change.

### Final checklist

- Can a reader follow the change locally?
- Are names and APIs carrying the meaning without narration?
- Did framework, persistence, vendor, and construction details stay behind boundaries?
- Are dependencies injected through constructors rather than constructed or
  reached for internally, and are boundaries expressed as interfaces?
- Does each touched class have one clear reason to change, is new behavior
  added via a new implementation rather than edited branching logic, and can
  alternate implementations substitute for one another without caller
  caveats?
- Does each touched file still have exactly one primary top level export, with
  no barrel files or re-exported types introduced?
- Do all touched top level classes, interfaces, types, values, and schema
  fields have multiline doc comments describing intent, constraints, and
  return values?
- Does the affected directory's `README.md` still accurately describe the
  purpose and contents of the directory?
- Does touched code route diagnostics through the logging framework instead
  of calling `console.*` directly, and does it log the important decisions
  and configuration that affect its behavior?
