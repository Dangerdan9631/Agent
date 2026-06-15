# Contract: Specify-Stage Injection

Defines how repository workflows augment the normal specify stage without replacing it.

## Injection Payload

```json
{
  "workflowTypeId": "repository-drift",
  "instructions": [
    "Describe living-spec changes as future work.",
    "Do not treat unresolved ambiguity as blocked."
  ],
  "evidenceSummary": [
    {
      "id": "ev-001",
      "sourceType": "test",
      "sourceRef": "tests/integration/living-specs.test.ts",
      "behaviorSummary": "Cucumber scenarios run during implementation.",
      "evidenceKind": "confirmed-behavior",
      "confidence": "high"
    }
  ],
  "proposedLivingSpecChanges": [
    {
      "changeType": "update",
      "targetRef": "living-specs/authentication.feature:Scenario login succeeds",
      "reason": "Observed behavior now requires MFA prompt."
    }
  ],
  "testGapRecommendations": [
    {
      "behaviorId": "login-mfa",
      "recommendedValidationTarget": "User sees MFA prompt after valid password."
    }
  ],
  "questions": [
    {
      "id": "authority-login-mfa",
      "prompt": "Should code or existing living spec be authoritative for MFA behavior?"
    }
  ],
  "assumptions": [
    "Authentication behavior is user-facing."
  ]
}
```

## Specify Requirements

1. MUST preserve standard feature spec headings.
2. MUST preserve quality checklist and clarify compatibility.
3. MUST include repository evidence and test mapping for each proposed living-spec change.
4. MUST distinguish confirmed behavior, inferred intent, assumptions, conflicts, and limitations.
5. MUST include unresolved ambiguity in the output rather than blocking solely because ambiguity remains.
6. MUST describe living-spec and test work as downstream changes, not direct specify-stage writes.

## Interview Requirements

1. Discovery evidence MAY answer existing specify questions when it is high-confidence.
2. Conflict or authority questions MUST be surfaced to the maintainer when they affect proposed changes.
3. Clarify MUST remain available to correct or refine the produced feature spec before plan.

## Output Sections

Repository workflow specify outputs SHOULD include these sections in addition to standard sections:

- `Repository Discovery Evidence`
- `Proposed Living Spec Changes`
- `Test Coverage Mapping`
- `Unresolved Ambiguity`
- `Assumptions and Limitations`

## Invalid Behavior

- Replacing the standard spec with a custom report-only format.
- Creating retrospective specs that describe shipped behavior as completed work.
- Omitting evidence or test mapping for in-scope changes.
- Writing `.feature` files or tests during specify.
