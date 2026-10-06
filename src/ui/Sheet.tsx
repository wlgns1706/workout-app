import type { ReactNode } from 'react';

interface Props {
  title: string;
  onClose(): void;
  closeLabel?: string;
  children: ReactNode;
}

/** 화면 아래에서 올라오는 팝업. 내용이 길면 안쪽이 스크롤되고, 닫기 버튼은 항상 아래에 보인다. */
export function Sheet({ title, onClose, children, closeLabel = '확인' }: Props) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className="sheet-body">{children}</div>
        <button type="button" className="btn block sheet-close" onClick={onClose}>{closeLabel}</button>
      </div>
    </div>
  );
}
