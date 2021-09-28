import { AngularFireFunctions } from '@angular/fire/compat/functions';
/**
 * @description calls cloud function
 * @param functions you want to make callable
 * @param name of the cloud function
 * @param params you want to set
 */
export async function callFunction<
  C extends Record<string, (...args: any) => any>,
  N extends Extract<keyof C, string>
>(
  functions: AngularFireFunctions,
  name: N,
  params?: Parameters<C[N]>
): Promise<ReturnType<C[N]>> {
  const callable = functions.httpsCallable(name);
  return callable(params).toPromise();
}
