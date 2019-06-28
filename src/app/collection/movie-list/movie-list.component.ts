import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MovieQuery, Movie } from '../+state';
import { Observable } from 'rxjs';

@Component({
  selector: 'movie-list',
  templateUrl: './movie-list.component.html',
  styleUrls: ['./movie-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MovieListComponent implements OnInit {

  public movies$: Observable<Movie[]>;
  public loading$: Observable<boolean>;

  constructor(private query: MovieQuery) { }

  ngOnInit() {
    this.movies$ = this.query.selectAll();
    this.loading$ = this.query.selectLoading();
  }

}
