/**
 * @description calls cloud function
 * @param functions you want to make callable
 * @param name of the cloud function
 * @param params you want to set
 */
import {Functions, httpsCallableData} from '@angular/fire/functions';

export async function callFunction<
  C extends Record<string, (...args: any) => any>,
  N extends Extract<keyof C, string>
>(
  functions: Functions,
  name: N,
  params?: Parameters<C[N]>
): Promise<ReturnType<C[N]>> {
  const callable = httpsCallableData<Parameters<C[N]>, ReturnType<C[N]>>(functions, name);

  return callable(params).toPromise();
}
