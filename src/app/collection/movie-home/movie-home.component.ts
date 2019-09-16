import { Component, OnInit } from '@angular/core';
import { Movie, MovieQuery } from '../+state';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-movie-home',
  templateUrl: './movie-home.component.html',
  styleUrls: ['./movie-home.component.css']
})
export class MovieHomeComponent implements OnInit {
  public movie$: Observable<Movie>;

  constructor(private movieQuery: MovieQuery) { }

  ngOnInit() {
    this.movie$ = this.movieQuery.selectActive();
  }

}
