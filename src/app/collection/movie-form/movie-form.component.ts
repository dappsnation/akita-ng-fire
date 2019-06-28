import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MovieForm } from '../movie.form';
import { MovieService } from '../+state';

@Component({
  selector: 'movie-form',
  templateUrl: './movie-form.component.html',
  styleUrls: ['./movie-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MovieFormComponent implements OnInit {

  public form: MovieForm;

  constructor(private service: MovieService) {}

  ngOnInit() {
    this.form = new MovieForm();
  }

  submit() {
    if (this.form.valid) {
      this.service.add(this.form.value);
    }
  }

}
