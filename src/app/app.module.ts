import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';

import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { HomeComponent } from './home/home.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [AppComponent, HomeComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    // Material
    MatSnackBarModule,
    // Angular Firebase
    AngularFireModule.initializeApp({
      apiKey: 'AIzaSyALX_NJPnLEWHgVQTGxZAYbUuMQTesRElw',
      authDomain: 'akita-firebase-f56e0.firebaseapp.com',
      databaseURL: 'https://akita-firebase-f56e0.firebaseio.com',
      projectId: 'akita-firebase-f56e0',
      storageBucket: 'akita-firebase-f56e0.appspot.com',
      messagingSenderId: '677510358740',
      appId: '1:677510358740:web:f91dfbb55eb630b2'
    }),
    AngularFirestoreModule,
    // Routers
    RouterModule.forRoot([
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      {
        path: 'movies',
        loadChildren: () => import('./collection/movie.module').then(m => m.MovieModule)
      }
    ]),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
