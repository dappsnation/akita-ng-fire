// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyD8fRfGLDsh8u8pXoKwzxiDHMqg-b1IpN0",
    authDomain: "akita-ng-fire-f93f0.firebaseapp.com",
    databaseURL: "https://akita-ng-fire-f93f0.firebaseio.com",
    projectId: "akita-ng-fire-f93f0",
    storageBucket: "akita-ng-fire-f93f0.appspot.com",
    messagingSenderId: "561612331472",
    appId: "1:561612331472:web:307acb3b5d26ec0cb8c1d5"
  },
  firestoreSettings: {
    host: 'localhost:8080',
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
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
