import { AngularFireFunctions } from '@angular/fire/functions';
/**
 * @description calls cloud function
 * @param functions you want to make callable
 * @param name of the cloud function
 * @param params you want to set
 */
export async function callFunction(functions: AngularFireFunctions, name: string, params?: any) {
    const callableFunc = functions.httpsCallable(name);
    return callableFunc(params).toPromise();
}