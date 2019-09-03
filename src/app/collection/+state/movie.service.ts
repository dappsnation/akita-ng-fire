import { Injectable } from '@angular/core';
import { MovieStore, MovieState } from './movie.store';
import { CollectionConfig, CollectionService, AtomicWrite } from 'akita-ng-fire';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies' })
export class MovieService extends CollectionService<MovieState> {

  constructor(store: MovieStore) {
    super(store);
  }

  async onDelete(id: string, write: AtomicWrite) {
    const snapshot = await this.db.collection(`movies/${id}/stakeholders`).ref.get();
    const operations = snapshot.docs.map(doc => write.delete(doc.ref));
    return Promise.all(operations);
  }

}
