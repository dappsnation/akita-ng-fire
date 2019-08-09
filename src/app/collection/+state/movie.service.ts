import { Injectable } from '@angular/core';
import { MovieStore, MovieState } from './movie.store';
import { AngularFirestore } from '@angular/fire/firestore';
import { CollectionConfig, CollectionService } from 'akita-ng-fire';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies' })
export class MovieService extends CollectionService<MovieState> {

  constructor(store: MovieStore) {
    super(store);
  }

}
