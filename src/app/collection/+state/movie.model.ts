export interface Movie {
  id: string;
  title: string;
  description: string;
}

/**
 * A factory function that creates Movie
 */
export function createMovie(params: Partial<Movie>) {
  return {

  } as Movie;
}
