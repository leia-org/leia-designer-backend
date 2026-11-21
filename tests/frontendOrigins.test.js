import { describe, it, expect } from 'vitest';
import { createFrontendOriginHandler } from '../src/utils/frontendOrigins.js';

function result(origin, domains = '', allowed = ['https://pre.designer.leia.ovh']) {
  let outcome;
  createFrontendOriginHandler(allowed, domains)(origin, (error, accepted) => {
    outcome = { error, accepted };
  });
  return outcome;
}

describe('Cloudflare frontend preview origins', () => {
  it('preserves exact origins and requests without Origin', () => {
    expect(result(undefined).accepted).toBe(true);
    expect(result('https://pre.designer.leia.ovh').accepted).toBe(true);
  });

  it('keeps previews disabled unless configured for this deployment', () => {
    expect(result('https://pre-123.designer.leia.ovh').error).toBeInstanceOf(Error);
  });

  it('accepts PR and branch previews only under explicitly configured domains', () => {
    const domains = 'designer.leia.ovh, workbench.leia.ovh';
    for (const origin of ['https://pre-123.designer.leia.ovh', 'https://pre-87.workbench.leia.ovh', 'https://branch-feature-123456ab.designer.leia.ovh']) {
      expect(result(origin, domains).accepted).toBe(true);
    }
  });

  it('rejects unrelated domains, nested hosts, deceptive suffixes and invalid preview labels', () => {
    for (const origin of [
      'https://pre-123.designer.leia.ovh.evil.test',
      'https://pre-123.evil-designer.leia.ovh',
      'https://nested.pre-123.designer.leia.ovh',
      'https://pre-0.designer.leia.ovh',
      'https://pre-text.designer.leia.ovh',
      'https://pre-123.workbench.leia.ovh',
      'https://designer.leia.ovh',
    ]) {
      expect(result(origin, 'designer.leia.ovh').error).toBeInstanceOf(Error);
    }
  });

  it('rejects HTTP, explicit ports, URL credentials, paths and malformed origins', () => {
    for (const origin of [
      'http://pre-123.designer.leia.ovh',
      'https://pre-123.designer.leia.ovh:8443',
      'https://user@pre-123.designer.leia.ovh',
      'https://pre-123.designer.leia.ovh/path',
      'not a URL',
    ]) {
      expect(result(origin, 'designer.leia.ovh').error).toBeInstanceOf(Error);
    }
  });
});
