import { ID } from '@datorama/akita';

export interface Stakeholder {
  id: ID;
  name: string;
}

/**
 * A factory function that creates Stakeholder
 */
export function createStakeholder(params: Partial<Stakeholder>) {
  return {
    name: 'Default Name',
    ...params
  } as Stakeholder;
}
