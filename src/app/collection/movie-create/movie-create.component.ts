import { Component, OnInit } from '@angular/core';
import { MovieService, Movie } from '../+state';
import { Router } from '@angular/router';

@Component({
  selector: 'movie-create',
  templateUrl: './movie-create.component.html',
  styleUrls: ['./movie-create.component.css'],
})
export class MovieCreateComponent {
  constructor(private service: MovieService, private router: Router) {}

  async create(movie: Movie) {
    await this.service.add(movie);
    this.router.navigate(['/movies/list']);
  }
}
