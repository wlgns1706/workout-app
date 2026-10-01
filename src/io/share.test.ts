import { describe, expect, test } from 'vitest';
import { shareOrDownload } from './share';

describe('shareOrDownload', () => {
  test('파일 공유를 지원하면 공유 창으로 보낸다', async () => {
    const shared: File[] = [];
    const nav = { canShare: () => true, share: async (d: { files: File[] }) => void shared.push(...d.files) };
    const downloaded: string[] = [];
    const result = await shareOrDownload('b.json', { a: 1 }, nav, (name) => downloaded.push(name));
    expect(result).toBe('shared');
    expect(shared[0].name).toBe('b.json');
    expect(JSON.parse(await shared[0].text())).toEqual({ a: 1 });
    expect(downloaded).toEqual([]);
  });
  test('공유를 지원하지 않으면 다운로드한다', async () => {
    const downloaded: string[] = [];
    expect(await shareOrDownload('b.json', {}, {}, (name) => downloaded.push(name))).toBe('downloaded');
    expect(downloaded).toEqual(['b.json']);
  });
  test('사용자가 공유 창을 닫으면 아무것도 하지 않는다', async () => {
    const abort = Object.assign(new Error('cancel'), { name: 'AbortError' });
    const nav = { canShare: () => true, share: async () => { throw abort; } };
    const downloaded: string[] = [];
    expect(await shareOrDownload('b.json', {}, nav, (name) => downloaded.push(name))).toBe('cancelled');
    expect(downloaded).toEqual([]);
  });
  test('공유가 다른 이유로 실패하면 다운로드로 대신한다', async () => {
    const nav = { canShare: () => true, share: async () => { throw new Error('denied'); } };
    const downloaded: string[] = [];
    expect(await shareOrDownload('b.json', {}, nav, (name) => downloaded.push(name))).toBe('downloaded');
  });
});
