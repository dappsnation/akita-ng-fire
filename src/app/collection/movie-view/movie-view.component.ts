import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';
import { Movie, MovieQuery } from '../+state';
import { Router } from '@angular/router';

@Component({
  selector: 'movie-view',
  templateUrl: './movie-view.component.html',
  styleUrls: ['./movie-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieViewComponent implements OnInit {
  public movie$: Observable<Movie>;
  public movies$: Observable<Movie[]>;
  public loading$: Observable<boolean>;

  constructor(private query: MovieQuery, private router: Router) {}

  ngOnInit() {
    this.movie$ = this.query.selectActive();
    this.movies$ = this.query.selectAll();
    this.loading$ = this.query.selectLoading();
  }

  redirect(nextId: string) {
    const oldId = this.query.getActiveId();
    const nextUrl = this.router.url.replace(oldId, nextId);
    this.router.navigateByUrl(nextUrl);
  }
}
