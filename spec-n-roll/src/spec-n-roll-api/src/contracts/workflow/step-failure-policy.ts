/**
 * Determines how workflow orchestration proceeds after a step fails.
 */
export type StepFailurePolicy =
  | {
      /**
       * Stops the workflow immediately after the failed attempt.
       */
      readonly strategy: 'stop';
    }
  | {
      /**
       * Continues to the next ordered step after recording the failure.
       */
      readonly strategy: 'continue';
    }
  | {
      /**
       * Retries the step until it succeeds or reaches this inclusive attempt limit.
       */
      readonly strategy: 'retry';

      /**
       * Maximum total attempts, including the initial attempt. The value must be at least two.
       */
      readonly maxAttempts: number;
    };
