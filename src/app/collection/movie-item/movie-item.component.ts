import { Component, Output, Input, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { Movie } from '../+state';

@Component({
  selector: 'movie-item',
  templateUrl: './movie-item.component.html',
  styleUrls: ['./movie-item.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MovieItemComponent {
  @Input() movie: Movie;
  @Output() delete = new EventEmitter<string>();
}
