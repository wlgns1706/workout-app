import { useState } from 'react';
import { formatDateLabel, monthGrid, shiftMonth } from '../domain/calendar';
import { todayStr } from '../domain/date';
import { Sheet } from './Sheet';

export type DayMark = 'kept' | 'recorded';

interface Props {
  value: string;
  onChange(date: string): void;
  marks?: Record<string, DayMark>;
  summary?: (year: number, month: number) => string;
}

const HEAD = ['월', '화', '수', '목', '금', '토', '일'];

/** 날짜 버튼. 누르면 달력 팝업이 열린다. 미래 날짜는 고를 수 없다. */
export function DatePicker({ value, onChange, marks, summary }: Props) {
  const [open, setOpen] = useState(false);
  const today = todayStr();
  const [y0, m0] = value.split('-').map(Number);
  const [view, setView] = useState({ year: y0, month: m0 });

  const show = () => {
    setView({ year: y0, month: m0 });
    setOpen(true);
  };
  const pick = (date: string) => {
    onChange(date);
    setOpen(false);
  };

  return (
    <>
      <button type="button" className="datebtn" onClick={show} aria-label="날짜 고르기">
        {formatDateLabel(value)}{value === today && ' · 오늘'} ▾
      </button>
      {open && (
        <Sheet title="날짜 고르기" onClose={() => setOpen(false)}>
          <div className="row between">
            <button type="button" className="btn small" aria-label="이전 달" onClick={() => setView(shiftMonth(view.year, view.month, -1))}>◀</button>
            <strong>{view.year}년 {view.month}월</strong>
            <button type="button" className="btn small" aria-label="다음 달" onClick={() => setView(shiftMonth(view.year, view.month, 1))}>▶</button>
          </div>
          <div className="cal">
            {HEAD.map((h) => <span key={h} className="calhead">{h}</span>)}
            {monthGrid(view.year, view.month).map((date, i) =>
              date == null ? (
                <span key={`e${i}`} />
              ) : (
                <button
                  key={date}
                  type="button"
                  className={['calday', date === today ? 'today' : '', date === value ? 'selected' : ''].join(' ')}
                  disabled={date > today}
                  onClick={() => pick(date)}
                >
                  {Number(date.slice(8))}
                  <i className={`dot ${marks?.[date] ?? ''}`} />
                </button>
              ),
            )}
          </div>
          {summary && <p className="muted" style={{ textAlign: 'center' }}>{summary(view.year, view.month)}</p>}
          <button type="button" className="btn block" onClick={() => pick(today)}>오늘로 가기</button>
        </Sheet>
      )}
    </>
  );
}
