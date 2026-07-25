import type { StepDefinition, WorkflowDefinition } from 'spec-n-roll-api';
import type {
  WorkflowDefinitionValidationIssue,
  WorkflowDefinitionValidationResult,
} from '#sdk/application/workflows/workflow-definition-validation.js';

/**
 * Validates public workflow definitions before transition or hook processing accepts them.
 */
export class WorkflowDefinitionValidator {
  /**
   * Checks identity, ordering, references, schemas, completion criteria, and failure policies.
   *
   * @param definition - Immutable workflow definition received at the SDK boundary.
   * @returns An accepted definition or structured validation issues.
   */
  public validate(
    definition: WorkflowDefinition,
  ): WorkflowDefinitionValidationResult {
    const issues: WorkflowDefinitionValidationIssue[] = [];
    this.validateWorkflowIdentity(definition, issues);
    this.validateSteps(definition.stepDefinitions, issues);
    this.validateOrdering(definition, issues);

    return issues.length === 0
      ? { status: 'accepted', definition }
      : { status: 'rejected', issues };
  }

  private validateWorkflowIdentity(
    definition: WorkflowDefinition,
    issues: WorkflowDefinitionValidationIssue[],
  ): void {
    if (definition.schemaVersion !== '1') {
      issues.push({
        path: 'schemaVersion',
        message: `Workflow schema version "${String(definition.schemaVersion)}" is not supported.`,
      });
    }
    this.requireText(definition.id, 'id', issues);
    this.requireText(definition.version, 'version', issues);
    this.requireText(definition.metadata.name, 'metadata.name', issues);
  }

  private validateSteps(
    definitions: readonly StepDefinition[],
    issues: WorkflowDefinitionValidationIssue[],
  ): void {
    const identifiers = new Set<string>();

    definitions.forEach((step, index) => {
      const path = `stepDefinitions.${index}`;
      this.requireText(step.id, `${path}.id`, issues);
      this.requireText(step.skillId, `${path}.skillId`, issues);
      this.requireSchema(step.inputSchema, `${path}.inputSchema`, issues);
      this.requireSchema(step.outputSchema, `${path}.outputSchema`, issues);
      this.validateCompletionCriteria(step, path, issues);
      this.validateFailurePolicy(step, path, issues);

      if (identifiers.has(step.id)) {
        issues.push({
          path: `${path}.id`,
          message: `Step definition identifier "${step.id}" is duplicated.`,
        });
      }
      identifiers.add(step.id);
    });
  }

  private validateOrdering(
    definition: WorkflowDefinition,
    issues: WorkflowDefinitionValidationIssue[],
  ): void {
    const definitionIds = new Set(
      definition.stepDefinitions.map((step) => step.id),
    );
    const references = new Set<string>();

    definition.steps.forEach((stepId, index) => {
      const path = `steps.${index}`;
      this.requireText(stepId, path, issues);
      if (references.has(stepId)) {
        issues.push({
          path,
          message: `Ordered step reference "${stepId}" is duplicated.`,
        });
      }
      if (!definitionIds.has(stepId)) {
        issues.push({
          path,
          message: `Ordered step reference "${stepId}" has no definition.`,
        });
      }
      references.add(stepId);
    });

    definition.stepDefinitions.forEach((step, index) => {
      if (!references.has(step.id)) {
        issues.push({
          path: `stepDefinitions.${index}.id`,
          message: `Step definition "${step.id}" is missing from the ordered steps.`,
        });
      }
    });
  }

  private validateCompletionCriteria(
    step: StepDefinition,
    path: string,
    issues: WorkflowDefinitionValidationIssue[],
  ): void {
    if (step.completionCriteria == null) {
      return;
    }

    this.requireText(
      step.completionCriteria.description,
      `${path}.completionCriteria.description`,
      issues,
    );
    const outputProperties = this.schemaProperties(step.outputSchema);
    step.completionCriteria.requiredOutputProperties?.forEach(
      (property, index) => {
        this.requireText(
          property,
          `${path}.completionCriteria.requiredOutputProperties.${index}`,
          issues,
        );
        if (!outputProperties.has(property)) {
          issues.push({
            path: `${path}.completionCriteria.requiredOutputProperties.${index}`,
            message: `Required output property "${property}" is absent from the output schema.`,
          });
        }
      },
    );
  }

  private validateFailurePolicy(
    step: StepDefinition,
    path: string,
    issues: WorkflowDefinitionValidationIssue[],
  ): void {
    if (
      step.failurePolicy.strategy === 'retry' &&
      (!Number.isInteger(step.failurePolicy.maxAttempts) ||
        step.failurePolicy.maxAttempts < 2)
    ) {
      issues.push({
        path: `${path}.failurePolicy.maxAttempts`,
        message: 'Retry maxAttempts must be an integer of at least two.',
      });
    }
  }

  private requireSchema(
    schema: Readonly<Record<string, unknown>>,
    path: string,
    issues: WorkflowDefinitionValidationIssue[],
  ): void {
    if (schema.type !== 'object') {
      issues.push({
        path,
        message: 'Step schemas must declare JSON Schema type "object".',
      });
    }
  }

  private schemaProperties(
    schema: Readonly<Record<string, unknown>>,
  ): ReadonlySet<string> {
    const properties = schema.properties;
    if (properties == null || typeof properties !== 'object') {
      return new Set();
    }
    return new Set(Object.keys(properties));
  }

  private requireText(
    value: string,
    path: string,
    issues: WorkflowDefinitionValidationIssue[],
  ): void {
    if (value.trim().length === 0) {
      issues.push({ path, message: 'Value must be non-empty.' });
    }
  }
}
