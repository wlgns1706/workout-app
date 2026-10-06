export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'theme';

export function parseTheme(value: string | null): ThemePref {
  return value === 'light' || value === 'system' ? value : 'dark';
}

/** <html data-theme> 값. 시스템이면 속성을 두지 않는다. */
export function themeAttribute(pref: ThemePref): string | null {
  return pref === 'system' ? null : pref;
}

export function loadTheme(): ThemePref {
  try {
    return parseTheme(localStorage.getItem(KEY));
  } catch {
    return 'system';
  }
}

export function applyTheme(pref: ThemePref): void {
  const attr = themeAttribute(pref);
  if (attr) document.documentElement.setAttribute('data-theme', attr);
  else document.documentElement.removeAttribute('data-theme');
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // 저장할 수 없는 환경에서는 이번 실행에만 적용한다.
  }
}
