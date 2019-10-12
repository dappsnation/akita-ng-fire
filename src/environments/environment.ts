// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyALX_NJPnLEWHgVQTGxZAYbUuMQTesRElw',
    authDomain: 'akita-firebase-f56e0.firebaseapp.com',
    databaseURL: 'https://akita-firebase-f56e0.firebaseio.com',
    projectId: 'akita-firebase-f56e0',
    storageBucket: 'akita-firebase-f56e0.appspot.com',
    messagingSenderId: '677510358740',
    appId: '1:677510358740:web:f91dfbb55eb630b2'
  },
  firestoreSettings: {
    host: 'localhost:8081',
    ssl: false
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
