import { Observable, race } from 'rxjs';
import { map } from 'rxjs/operators';

interface ShouldCancelOptions {
  validate: Observable<any>;
  cancel: Observable<any>;
}

interface WaitForCancelOptions {
  startWith: () => void;
  endWith: (cancelled: boolean) => void;
  shouldValidate: Observable<any>;
  shouldCancel: Observable<any>;
}

export function shoudCancel({ validate, cancel }: ShouldCancelOptions) {
  return race([validate.pipe(map(_ => false)), cancel.pipe(map(_ => true))]);
}

export async function waitForCancel({
  startWith,
  endWith,
  shouldValidate,
  shouldCancel
}: WaitForCancelOptions) {
  startWith();
  const cancelled = await race([
    shouldValidate.pipe(map(_ => false)),
    shouldCancel.pipe(map(_ => true))
  ]).toPromise();
  endWith(cancelled);
}
