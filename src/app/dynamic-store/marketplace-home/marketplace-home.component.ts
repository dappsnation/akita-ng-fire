import { Component, OnInit } from '@angular/core';
import { MovieQuery, Movie } from 'src/app/collection/+state';
import { Observable } from 'rxjs';

@Component({
  selector: 'marketplace-home',
  templateUrl: './marketplace-home.component.html',
  styleUrls: ['./marketplace-home.component.css'],
})
export class MarketplaceHomeComponent implements OnInit {

  public movies$: Observable<Movie[]>;

  constructor(private movieQuery: MovieQuery) {}

  ngOnInit() {
    this.movies$ = this.movieQuery.selectAll();
    this.movieQuery.selectAll().subscribe(console.log)
  }  
}
