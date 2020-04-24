import { ID } from '@datorama/akita';

export interface Organization {
  id?: string;
  name: string;
  movieIds: string[];
}

/**
 * A factory function that creates Organization
 */
export function createOrganization(params: Partial<Organization>): Organization {
  return {
    movieIds: [],
    name: 'My Organization',
    ...params
  };
}
