import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { AuthModule } from './auth/auth.module';

import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './material.module';
import { HomeComponent } from './home/home.component';
import { RouterModule } from '@angular/router';

import { AkitaNgRouterStoreModule } from '@datorama/akita-ng-router-store';

@NgModule({
  declarations: [AppComponent, HomeComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AuthModule,
    // Material
    MaterialModule,
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
    AngularFireAuthModule,
    // Routers
    RouterModule.forRoot([
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      {
        path: 'movies',
        loadChildren: () => import('./collection/movie.module').then(m => m.MovieModule)
      },
      {
        path: 'catalog',
        loadChildren: () => import('./many-active/catalog.module').then(m => m.CatalogModule)
      },
      {
        path: 'company',
        loadChildren: () => import('./collection-group/company.module').then(m => m.CompanyModule)
      }
    ], { paramsInheritanceStrategy: 'always' }),
    AkitaNgRouterStoreModule.forRoot()
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
