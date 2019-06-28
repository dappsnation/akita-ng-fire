import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';
import { Movie, MovieQuery } from '../+state';

@Component({
  selector: 'movie-view',
  templateUrl: './movie-view.component.html',
  styleUrls: ['./movie-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MovieViewComponent implements OnInit {

  public movie$: Observable<Movie>;
  public loading$: Observable<boolean>;

  constructor(private query: MovieQuery) { }

  ngOnInit() {
    this.movie$ = this.query.selectActive();
    this.loading$ = this.query.selectLoading();
  }

}
