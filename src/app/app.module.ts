import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {AuthModule} from './auth/auth.module';

import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MaterialModule} from './material.module';
import {HomeComponent} from './home/home.component';
import {RouterModule} from '@angular/router';

import {AkitaNgRouterStoreModule} from '@datorama/akita-ng-router-store';
import {environment} from 'src/environments/environment';
import {getApp, initializeApp, provideFirebaseApp} from '@angular/fire/app';
import {enableIndexedDbPersistence, getFirestore, provideFirestore} from '@angular/fire/firestore';
import {initializeAuth, provideAuth, indexedDBLocalPersistence, browserPopupRedirectResolver} from '@angular/fire/auth';
import {getDatabase, provideDatabase} from '@angular/fire/database';

@NgModule({
  declarations: [AppComponent, HomeComponent],
  providers: [],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AuthModule,
    // Material
    MaterialModule,
    // Angular Firebase
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => {
      const firestore = getFirestore();
      enableIndexedDbPersistence(firestore);
      return firestore;
    }),
    provideAuth(() => initializeAuth(getApp(), {
      persistence: indexedDBLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver
    })),
    provideDatabase(() => getDatabase()),
    // Routers
    RouterModule.forRoot(
      [
        { path: '', redirectTo: 'home', pathMatch: 'full' },
        { path: 'home', component: HomeComponent },
        {
          path: 'movies',
          loadChildren: () =>
            import('./collection/movie.module').then((m) => m.MovieModule),
        },
        {
          path: 'catalog',
          loadChildren: () =>
            import('./many-active/catalog.module').then((m) => m.CatalogModule),
        },
        {
          path: 'organization',
          loadChildren: () =>
            import('./sync-many-ids/organization.module').then(
              (m) => m.OrganizationModule
            ),
        },
        {
          path: 'marketplace',
          loadChildren: () =>
            import('./dynamic-store/marketplace.module').then(
              (m) => m.MarketplaceModule
            ),
        },
        {
          path: 'vehicle',
          loadChildren: () =>
            import('./real-time/vehicle.module').then((m) => m.VehicleModule),
        },
      ],
      { paramsInheritanceStrategy: 'always', relativeLinkResolution: 'legacy' }
    ),
    AkitaNgRouterStoreModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
