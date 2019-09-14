import { Injectable } from '@angular/core';
import { MovieStore, MovieState } from './movie.store';
import { CollectionConfig, CollectionService, WriteOpts } from 'akita-ng-fire';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies' })
export class MovieService extends CollectionService<MovieState> {

  constructor(store: MovieStore) {
    super(store);
  }

  async onDelete(id: string, { write }: WriteOpts) {
    const snapshot = await this.db.collection(`movies/${id}/stakeholders`).ref.get();
    return snapshot.docs.map(doc => write.delete(doc.ref));
  }

}
