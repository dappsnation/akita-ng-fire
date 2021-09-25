import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MovieQuery, Movie, MovieService } from '../+state';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'movie-list',
  templateUrl: './movie-list.component.html',
  styleUrls: ['./movie-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieListComponent implements OnInit {
  public movies$: Observable<Movie[]>;
  public loading$: Observable<boolean>;

  constructor(
    private service: MovieService,
    private query: MovieQuery,
    private router: Router
  ) {}

  ngOnInit() {
    this.movies$ = this.query.selectAll();
    this.loading$ = this.query.selectLoading();
  }

  add(movie: Movie) {
    this.service.add(movie);
  }

  async remove(id: string) {
    await this.service.remove(id);
    // If there is no movie anymore, go to create page.
    if (this.query.getCount() === 0) {
      this.router.navigate(['movies/create']);
    }
  }
}
