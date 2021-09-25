import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MovieListGuard, ActiveMovieGuard } from './movie.guard';
import { MaterialModule } from '../material.module';

import { MovieListComponent } from './movie-list/movie-list.component';
import { MovieViewComponent } from './movie-view/movie-view.component';
import { MovieFormComponent } from './movie-form/movie-form.component';
import { MovieCreateComponent } from './movie-create/movie-create.component';
import { MovieItemComponent } from './movie-item/movie-item.component';
import { MovieHomeComponent } from './movie-home/movie-home.component';

@NgModule({
  declarations: [
    MovieListComponent,
    MovieViewComponent,
    MovieFormComponent,
    MovieCreateComponent,
    MovieItemComponent,
    MovieHomeComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'create', component: MovieCreateComponent },
      {
        path: 'list',
        canActivate: [MovieListGuard], // Manage subscription
        canDeactivate: [MovieListGuard], // Manage unsubscription
        component: MovieListComponent,
      },
      {
        path: ':movieId',
        canActivate: [ActiveMovieGuard], // Manage subscription
        canDeactivate: [ActiveMovieGuard], // Manage unsubscription
        data: {
          redirect: 'movies/list', // Redirect to movies/list if movieId not found
        },
        component: MovieViewComponent,
        children: [
          { path: '', redirectTo: 'home', pathMatch: 'full' },
          { path: 'home', component: MovieHomeComponent },
          {
            path: 'stakeholders',
            loadChildren: () =>
              import('../subcollection/stakeholder.module').then(
                (m) => m.StakeholderModule
              ),
          },
        ],
      },
    ]),
  ],
})
export class MovieModule {}
