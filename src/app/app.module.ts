import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { AuthModule } from './auth/auth.module';

import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireDatabaseModule } from '@angular/fire/compat/database';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './material.module';
import { HomeComponent } from './home/home.component';
import { RouterModule } from '@angular/router';

import { AkitaNgRouterStoreModule } from '@datorama/akita-ng-router-store';
import { environment } from 'src/environments/environment';

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
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule.enablePersistence(),
    AngularFireDatabaseModule,
    AngularFireAuthModule,
    AngularFireDatabaseModule,
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
          path: 'company',
          loadChildren: () =>
            import('./collection-group/company.module').then(
              (m) => m.CompanyModule
            ),
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
