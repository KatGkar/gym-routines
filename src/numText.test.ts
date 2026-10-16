import { describe, expect, it } from 'vitest';
import { sanitizeNum } from './numText';

describe('sanitizeNum', () => {
  it('keeps plain numbers and a trailing dot', () => {
    expect(sanitizeNum('0', true)).toBe('0');
    expect(sanitizeNum('60.', true)).toBe('60.');
  });

  it('turns a comma into a dot', () => {
    expect(sanitizeNum('60,5', true)).toBe('60.5');
  });

  it('drops letters and minus, and keeps only the first dot', () => {
    expect(sanitizeNum('-7e.5.2', true)).toBe('7.52');
  });

  it('strips dots when decimals are not allowed', () => {
    expect(sanitizeNum('12.5', false)).toBe('125');
    expect(sanitizeNum('8,', false)).toBe('8');
  });
});
