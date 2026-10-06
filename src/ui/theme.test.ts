import { describe, expect, test } from 'vitest';
import { parseTheme, themeAttribute } from './theme';

describe('themeAttribute', () => {
  test('시스템이면 속성을 두지 않고, 라이트와 다크는 그대로 둔다', () => {
    expect(themeAttribute('system')).toBeNull();
    expect(themeAttribute('light')).toBe('light');
    expect(themeAttribute('dark')).toBe('dark');
  });
});

describe('parseTheme', () => {
  test('저장된 값이 없거나 잘못됐으면 다크 (기본 디자인)', () => {
    expect(parseTheme(null)).toBe('dark');
    expect(parseTheme('blue')).toBe('dark');
    expect(parseTheme('system')).toBe('system');
    expect(parseTheme('dark')).toBe('dark');
  });
});
