import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  inferDomainFromDescription,
  resolveLivingSpecPath,
  routeLivingSpecFile,
} from '../../src/living-specs/gherkin.js';

describe('living spec domain routing', () => {
  it('infers user-authentication domain from authentication-related descriptions', () => {
    expect(inferDomainFromDescription('Add OAuth login for user authentication')).toBe(
      'user-authentication',
    );
    expect(inferDomainFromDescription('Implement sign-in with email and password')).toBe(
      'user-authentication',
    );
  });

  it('infers payment-processing domain from payment-related descriptions', () => {
    expect(inferDomainFromDescription('Process payment with credit card at checkout')).toBe(
      'payment-processing',
    );
  });

  it('infers order-management domain from order and shipping descriptions', () => {
    expect(inferDomainFromDescription('Send email notification when an order ships')).toBe(
      'order-management',
    );
  });

  it('resolves living-specs/{kebab-domain}.feature path from project root', () => {
    const projectRoot = path.resolve('living-spec-routing-test-root');
    expect(resolveLivingSpecPath(projectRoot, 'user-authentication')).toBe(
      path.resolve(projectRoot, 'living-specs', 'user-authentication.feature'),
    );
  });

  it('routes semantic domain description to the correct feature file path', () => {
    const projectRoot = path.resolve('living-spec-routing-project');
    const routed = routeLivingSpecFile(projectRoot, 'Add two-factor authentication for admins');
    expect(routed.domain).toBe('user-authentication');
    expect(routed.relativePath).toBe('living-specs/user-authentication.feature');
    expect(routed.absolutePath).toBe(
      path.resolve(projectRoot, 'living-specs', 'user-authentication.feature'),
    );
  });
});
