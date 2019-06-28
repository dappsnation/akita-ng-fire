import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MovieListComponent } from './movie-list/movie-list.component';
import { MovieViewComponent } from './movie-view/movie-view.component';
import { RouterModule } from '@angular/router';
import { MovieListGuard, ActiveMovieGuard } from './movie.guard';
import { MovieFormComponent } from './movie-form/movie-form.component';

@NgModule({
  declarations: [MovieListComponent, MovieViewComponent, MovieFormComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      {
        path: 'list',
        canActivate: [MovieListGuard],    // Manage subscription
        canDeactivate: [MovieListGuard],  // Manage unsubscription
        component: MovieListComponent
      }, {
        path: ':id',
        canActivate: [ActiveMovieGuard],    // Manage subscription
        canDeactivate: [ActiveMovieGuard],  // Manage unsubscription
        data: {
          redirect: 'movies/list' // Redirect to movies/list if id not found
        },
        component: MovieViewComponent
      }
    ])
  ]
})
export class MovieModule { }
