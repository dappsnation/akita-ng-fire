import { HashMap } from '@datorama/akita';

/** Get the params from a path */
export function getPathParams(path: string) {
  return path
    .split('/')
    .filter((segment) => segment.charAt(0) === ':')
    .map((segment) => segment.substr(1));
}

/**
 * Transform a path based on the params
 * @param path The path with params starting with "/:"
 * @param params A map of id params
 * @example pathWithParams('movies/:movieId/stakeholder/:shId', { movieId, shId })
 */
export function pathWithParams(path: string, params: HashMap<string>): string {
  return path
    .split('/')
    .map((segment) => {
      if (segment.charAt(0) === ':') {
        const key = segment.substr(1);
        if (!params[key]) {
          throw new Error(
            `Required parameter ${key} from ${path} doesn't exist in params ${JSON.stringify(
              params
            )}`
          );
        }
        return params[key];
      } else {
        return segment;
      }
    })
    .join('/');
}
