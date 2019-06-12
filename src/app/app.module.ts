import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import { environment } from '../environments/environment';

import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { HomeComponent } from './home/home.component';
import { RouterModule } from '@angular/router';
import { ListComponent } from './list/list.component';
import { TodoGuard } from './state/todo.guard';

@NgModule({
  declarations: [AppComponent, HomeComponent, ListComponent],
  imports: [
    BrowserModule,
    RouterModule.forRoot([
      { path: '', component: HomeComponent },
      { path: 'todos', component: ListComponent, canActivate: [TodoGuard], canDeactivate: [TodoGuard] }
    ]),
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
    environment.production ? [] : AkitaNgDevtools.forRoot(),
    BrowserAnimationsModule,
    MatSnackBarModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
