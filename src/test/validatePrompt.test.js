import { describe, it, expect } from 'vitest';
import { validatePrompt } from '../lib/fakeGenerate.js';

describe('validatePrompt', () => {
  it('returns null for a valid prompt', () => {
    expect(validatePrompt('Write a launch announcement.')).toBeNull();
  });

  it('returns an error for an empty string', () => {
    expect(validatePrompt('')).not.toBeNull();
  });

  it('returns an error for a whitespace-only string', () => {
    expect(validatePrompt('   ')).not.toBeNull();
  });

  it('returns an error for a non-string value', () => {
    expect(validatePrompt(null)).not.toBeNull();
    expect(validatePrompt(42)).not.toBeNull();
  });

  it('returns an error when prompt exceeds 1000 characters', () => {
    const longPrompt = 'a'.repeat(1001);
    expect(validatePrompt(longPrompt)).not.toBeNull();
  });

  it('returns null for a prompt of exactly 1000 characters', () => {
    const maxPrompt = 'a'.repeat(1000);
    expect(validatePrompt(maxPrompt)).toBeNull();
  });
});
