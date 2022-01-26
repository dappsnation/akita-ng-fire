import {lastValueFrom, Observable, race} from 'rxjs';
import { map } from 'rxjs/operators';

export interface ShouldCancelOptions {
  validate: Observable<any>;
  cancel: Observable<any>;
}

export interface WaitForCancelOptions {
  startWith: () => void;
  endWith: (cancelled: boolean) => void;
  shouldValidate: Observable<any>;
  shouldCancel: Observable<any>;
}

export function shouldCancel({ validate, cancel }: ShouldCancelOptions) {
  return race([
    validate.pipe(map((_) => false)),
    cancel.pipe(map((_) => true)),
  ]);
}

export async function waitForCancel({
  startWith,
  endWith,
  shouldValidate,
  shouldCancel,
}: WaitForCancelOptions) {
  startWith();
  const cancelled = await lastValueFrom(race([
    shouldValidate.pipe(map((_) => false)),
    shouldCancel.pipe(map((_) => true)),
  ]));
  endWith(cancelled);
}
