import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { activePlan } from '../db/repo';

/** 현재 일정과 그 프로그램. 읽는 중이면 undefined다. */
export function useActive() {
  return useLiveQuery(async () => {
    const plan = await activePlan(db);
    const programs = await db.programs.toArray();
    const program = plan ? programs.find((p) => p.id === plan.programId) : undefined;
    return { plan, program, programs };
  }, []);
}
