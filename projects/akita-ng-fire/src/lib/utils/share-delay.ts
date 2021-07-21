import {
  MonoTypeOperatorFunction,
  Observable,
  ReplaySubject,
  Subscriber,
  Subscription
} from 'rxjs';

/**
 * Replay the data and share it across source.
 * It will unsubscribe after a delay when there is no more subscriber
 * This is useful if you unsubscribe from a page & resubscribe on the other
 * @note code based on shareReplay of rxjs v6.6.7: https://github.com/ReactiveX/rxjs/blob/6.6.7/src/internal/operators/shareReplay.ts
 * @param delay Delay in ms to wait before unsubscribing
 */
export function shareWithDelay<T>(delay: number = 100): MonoTypeOperatorFunction<T> {
  let subject: ReplaySubject<T> | undefined;
  let subscription: Subscription | undefined;
  let refCount = 0;
  let hasError = false;
  let isComplete = false;
  let lastValue: T;
  function operation(this: Subscriber<T>, source: Observable<T>) {
    refCount++;
    let innerSub: Subscription | undefined;
    if (!subject || hasError) {
      hasError = false;
      subject = new ReplaySubject<T>(1, Infinity);
      if (lastValue) subject.next(lastValue);
      innerSub = subject.subscribe(this);
      subscription = source.subscribe({
        next(value) {
          subject?.next(value);
          lastValue = value;
        },
        error(err) {
          hasError = true;
          subject?.error(err);
        },
        complete() {
          isComplete = true;
          subscription = undefined;
          subject?.complete();
        }
      });

      // Here we need to check to see if the source synchronously completed. Although
      // we're setting `subscription = undefined` in the completion handler, if the source
      // is synchronous, that will happen *before* subscription is set by the return of
      // the `subscribe` call.
      if (isComplete) {
        subscription = undefined;
      }
    } else {
      innerSub = subject.subscribe(this);
    }

    this.add(() => {
      refCount--;
      innerSub?.unsubscribe();
      innerSub = undefined;
      
      // await some ms before unsubscribing
      setTimeout(() => {
        if (subscription && !isComplete && refCount === 0) {
          subscription.unsubscribe();
          subscription = undefined;
          subject = undefined;
        }
      }, delay);
    });
  }

  return (source: Observable<T>) => source.lift(operation);
}