import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type ChangeEvent } from 'react';
import { db } from '../../db/db';
import { getMeta, META_LAST_BACKUP } from '../../db/repo';
import { addDays, localDateOf, todayStr } from '../../domain/date';
import { parseSequence, totalWeeks } from '../../domain/schedule';
import { downloadJson } from '../../io/download';
import {
  applyBackup,
  applyProgram,
  backupFileName,
  backupSummary,
  exportBackup,
  ImportError,
  parseImport,
  type BackupFile,
} from '../../io/importExport';
import { useActive } from '../useActive';

type Message = { kind: 'ok' | 'error'; text: string } | null;

export default function SettingsPage() {
  const active = useActive();
  const lastBackup = useLiveQuery(() => getMeta(db, META_LAST_BACKUP), []);
  const [message, setMessage] = useState<Message>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [programId, setProgramId] = useState('');
  const [startDate, setStartDate] = useState(todayStr());
  const [sequence, setSequence] = useState('1,2,3');

  if (!active) return null;
  const { plan, program, programs } = active;
  const chosen = programs.find((p) => p.id === programId) ?? programs[0];

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMessage(null);
    try {
      const parsed = parseImport(await file.text());
      if (parsed.kind === 'backup') {
        setPending(parsed.backup);
        return;
      }
      const existing = await db.programs.get(parsed.program.id);
      if (existing && !window.confirm(`"${existing.name}" 프로그램이 이미 있습니다. 덮어쓸까요?`)) return;
      await applyProgram(db, parsed.program);
      setMessage({ kind: 'ok', text: `"${parsed.program.name}" 프로그램을 가져왔습니다.` });
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof ImportError ? err.message : '파일을 읽지 못했습니다.' });
    }
  }

  async function restore() {
    if (!pending) return;
    try {
      await applyBackup(db, pending);
      setMessage({ kind: 'ok', text: '백업을 복원했습니다.' });
    } catch {
      setMessage({ kind: 'error', text: '복원하지 못했습니다. 기존 기록은 그대로입니다.' });
    }
    setPending(null);
  }

  async function createPlan() {
    if (!chosen) return;
    const blockSequence = parseSequence(sequence, chosen.blocks.length);
    if (!blockSequence) {
      setMessage({ kind: 'error', text: `블록 순서는 1~${chosen.blocks.length} 사이 숫자를 쉼표로 구분해 적어 주세요. 예: 1,1,2,3` });
      return;
    }
    if (plan && !window.confirm('새 일정을 만들면 "오늘" 화면이 새 일정으로 바뀝니다. 이전 기록은 그대로 남습니다. 계속할까요?')) return;
    await db.plans.put({
      id: crypto.randomUUID(),
      programId: chosen.id,
      startDate,
      blockSequence,
      createdAt: new Date().toISOString(),
    });
    setMessage({ kind: 'ok', text: '일정을 만들었습니다.' });
  }

  async function backup() {
    try {
      downloadJson(backupFileName(), await exportBackup(db));
      setMessage({ kind: 'ok', text: '백업 파일을 저장했습니다. 구글 드라이브 같은 곳에 옮겨 두세요.' });
    } catch {
      setMessage({ kind: 'error', text: '백업 파일을 만들지 못했습니다.' });
    }
  }

  const summary = pending ? backupSummary(pending) : null;

  return (
    <main className="page">
      <h1>설정</h1>
      {message && <div className={message.kind} role="status">{message.text}</div>}

      <h2>프로그램</h2>
      <div className="card">
        {programs.length === 0 ? (
          <p className="muted">가져온 프로그램이 없습니다. 프로그램 파일(.json)을 가져오세요.</p>
        ) : (
          <ul>{programs.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
        )}
        <label className="btn block">
          프로그램 또는 백업 파일 가져오기
          <input type="file" accept=".json,application/json" hidden onChange={onFile} />
        </label>
      </div>

      {pending && summary && (
        <div className="card">
          <strong>이 백업으로 복원할까요?</strong>
          <p className="muted">
            세트 기록 {summary.setCount}개, 몸 상태 기록 {summary.bodyCount}개
            {summary.from && ` · ${summary.from} ~ ${summary.to}`}
            <br />프로그램: {summary.programNames.join(', ') || '없음'}
            <br />저장한 날: {localDateOf(pending.exportedAt)}
          </p>
          <p>지금 폰에 있는 기록은 모두 이 백업의 내용으로 바뀝니다.</p>
          <div className="row">
            <button className="btn primary" onClick={restore}>복원</button>
            <button className="btn" onClick={() => setPending(null)}>취소</button>
          </div>
        </div>
      )}

      <h2>일정</h2>
      <div className="card">
        {plan ? (
          <p>
            {program ? program.name : '프로그램을 찾을 수 없음'} · {plan.startDate} 시작
            <br />
            <span className="muted">
              블록 순서 {plan.blockSequence.join(' → ')} · 총 {totalWeeks(plan)}주 · {addDays(plan.startDate, totalWeeks(plan) * 7 - 1)} 종료
            </span>
          </p>
        ) : (
          <p className="muted">아직 일정이 없습니다.</p>
        )}
        {plan && !program && <div className="error">이 일정의 프로그램이 폰에 없습니다. 프로그램 파일을 다시 가져오세요.</div>}
        {programs.length > 0 && chosen && (
          <>
            <strong>새 일정 만들기</strong>
            <label className="field">
              <span>프로그램</span>
              <select value={chosen.id} onChange={(e) => setProgramId(e.target.value)}>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>시작일</span>
              <input type="date" value={startDate} onChange={(e) => e.target.value && setStartDate(e.target.value)} />
            </label>
            <label className="field">
              <span>블록 순서 (블록 하나는 4주)</span>
              <input type="text" inputMode="numeric" value={sequence} onChange={(e) => setSequence(e.target.value)} />
            </label>
            <button className="btn primary block" onClick={createPlan}>일정 만들기</button>
          </>
        )}
      </div>

      <h2>백업</h2>
      <div className="card">
        <p className="muted">마지막 백업: {lastBackup ? localDateOf(lastBackup) : '없음'}</p>
        <button className="btn primary block" onClick={backup}>백업 내보내기</button>
        <p className="muted">복원하려면 위의 "파일 가져오기"에서 백업 파일을 고르세요.</p>
      </div>

      <p className="muted">버전 {__APP_VERSION__}</p>
    </main>
  );
}
