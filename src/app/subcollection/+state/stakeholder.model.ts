import { ID } from '@datorama/akita';

export interface Stakeholder {
  id: ID;
}

/**
 * A factory function that creates Stakeholder
 */
export function createStakeholder(params: Partial<Stakeholder>) {
  return {

  } as Stakeholder;
}
