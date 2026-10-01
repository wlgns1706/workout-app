import type { ReactNode } from 'react';

interface Props {
  title: string;
  onClose(): void;
  children: ReactNode;
}

/** 화면 아래에서 올라오는 팝업. 바깥을 누르거나 "확인"을 누르면 닫힌다. */
export function Sheet({ title, onClose, children }: Props) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
        <button type="button" className="btn primary block" style={{ marginTop: 12 }} onClick={onClose}>확인</button>
      </div>
    </div>
  );
}
