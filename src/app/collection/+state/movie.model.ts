import { Stakeholder } from 'src/app/subcollection/+state';

export interface Movie {
  id: string;
  title: string;
  description: string;
  stakeholders?: Stakeholder[];
}

/**
 * A factory function that creates Movie
 */
export function createMovie(params: Partial<Movie>) {
  return {
    id: '',
    title: '',
    description: '',
    ...params,
  } as Movie;
}
