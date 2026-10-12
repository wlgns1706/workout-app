import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type ShowUndo = (text: string, undo: () => unknown) => void;

const UndoContext = createContext<ShowUndo>(() => {});
const SHOW_MS = 6000;

/** 지운 뒤 잠깐 "되돌리기"를 띄운다. */
export function UndoProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<{ id: number; text: string; undo: () => unknown } | null>(null);
  useEffect(() => {
    if (!item) return;
    const t = window.setTimeout(() => setItem(null), SHOW_MS);
    return () => window.clearTimeout(t);
  }, [item]);
  const show: ShowUndo = (text, undo) => setItem({ id: Date.now(), text, undo });

  return (
    <UndoContext.Provider value={show}>
      {children}
      {item && (
        <div className="toast" role="status" key={item.id}>
          <span>{item.text}</span>
          <button
            type="button"
            className="btn small"
            onClick={async () => {
              setItem(null);
              await item.undo();
            }}
          >
            되돌리기
          </button>
        </div>
      )}
    </UndoContext.Provider>
  );
}

export const useUndo = () => useContext(UndoContext);
