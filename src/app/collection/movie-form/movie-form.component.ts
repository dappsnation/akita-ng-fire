import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
} from '@angular/core';
import { MovieForm } from '../movie.form';
import { MovieService, Movie } from '../+state';

@Component({
  selector: 'movie-form',
  templateUrl: './movie-form.component.html',
  styleUrls: ['./movie-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieFormComponent implements OnInit {
  @Output() create = new EventEmitter<Movie>();
  public form: MovieForm;

  constructor() {}

  ngOnInit() {
    this.form = new MovieForm();
  }
}
