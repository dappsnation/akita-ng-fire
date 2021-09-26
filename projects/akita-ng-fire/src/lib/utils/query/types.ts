import { Subscription } from 'rxjs';
import { QueryFn } from '@angular/fire/compat/firestore';

export type TypeofArray<T> = T extends (infer X)[] ? X : T;

export type Query<T> = {
  path: string;
  queryFn?: QueryFn;
} & SubQueries<TypeofArray<T>>;

export type QueryLike<T> = Query<T> | Query<T>[] | string;
export type SubQueries<T> = {
  [K in keyof Partial<T>]:
    | (QueryLike<T[K]> | T[K])
    | ((entity: T) => QueryLike<T[K]>);
};

export interface CollectionChild<E> {
  parentId: string;
  key: Extract<keyof E, string>;
}

export interface SubscriptionMap {
  [id: string]: Subscription;
}
