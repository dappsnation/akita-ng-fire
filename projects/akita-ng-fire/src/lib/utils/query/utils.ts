import { SubQueries, Query } from './types';
import { QueryFn } from '@angular/fire/compat/firestore';

export const queryKeys = ['path', 'queryFn'];

export function getSubQueryKeys(query: Query<any>) {
  const keys = Object.keys(query);
  return keys.filter((key) => !queryKeys.includes(key));
}

export function hasSubQueries(query: Query<any>) {
  return getSubQueryKeys(query).length > 0;
}

export function getSubQuery<E, K extends keyof E>(
  query: SubQueries<E>[K],
  parent: E
): SubQueries<E>[K] {
  if (typeof query !== 'function') {
    return query;
  }
  return query(parent);
}

export function isDocPath(path: string) {
  return path.split('/').length % 2 === 0;
}

/** Transform a path into a collection Query */
export function collection<T = any>(
  path: string,
  queryFn?: QueryFn
): Query<T[]> {
  return { path, queryFn } as Query<T[]>;
}

/** Transform a path into a doc query */
export function doc<T = any>(path: string): Query<T> {
  return { path } as Query<T>;
}

/** Check if a value is a query */
export function isQuery<T>(query: any): query is Query<T> {
  if (typeof query === 'object' && query !== null) {
    return !!query['path'];
  }
  return false;
}
