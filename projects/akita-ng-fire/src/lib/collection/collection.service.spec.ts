import { CollectionService } from './collection.service';
import { createServiceFactory, SpectatorService, SpyObject } from '@ngneat/spectator';
import { FirestoreSettingsToken, AngularFirestore } from '@angular/fire/firestore';
import { FirebaseOptionsToken } from '@angular/fire';
import { EntityStore, QueryEntity, StoreConfig, EntityState, ActiveState } from '@datorama/akita';
import { Injectable } from '@angular/core';

interface Movie {
  title: string;
  id?: string;
}

interface MovieState extends EntityState<Movie, string>, ActiveState<string> {}

@Injectable()
@StoreConfig({ name: 'movies' })
class MovieStore extends EntityStore<MovieState> {
  constructor() {
    super();
  }
}

@Injectable()
class MovieQuery extends QueryEntity<MovieState> {
  constructor(store: MovieStore) {
    super(store);
  }
}

@Injectable()
class MovieService extends CollectionService<MovieState> {
  constructor(store: MovieStore, db: AngularFirestore) {
    super(store, 'movies', db);
  }
}

describe('CollectionService', () => {
  let spectator: SpectatorService<MovieService>;
  let service: MovieService;
  let store: SpyObject<MovieStore>;
  let query: SpyObject<MovieQuery>;
  let db: AngularFirestore;
  const createService = createServiceFactory({
    service: MovieService,
    mocks: [],
    providers: [
      MovieStore,
      MovieQuery,
      AngularFirestore,
      {
        provide: FirestoreSettingsToken,
        useValue: { host: 'localhost:8081', ssl: false }
      }, {
        provide: FirebaseOptionsToken,
        useValue: { projectId: 'testing-app' },
      }
    ]
  });

  beforeEach(async () => {
    spectator = createService();
    service = spectator.service;
    store = spectator.get(MovieStore);
    query = spectator.get(MovieQuery);
    db = spectator.get(AngularFirestore);
    // Clear Database & store
    const snap = await db.collection('movies').ref.get();
    await Promise.all(snap.docs.map(({ ref }) => ref.delete()));
    store.set({ entities: {}, ids: [] });
  });

  it('Should exist', () => {
    expect(spectator.service).toBeTruthy();
  });

  // service.getValue()

  it('getValue return null when does not exist', async () => {
    const movie = await service.getValue('1');
    expect(movie).toBeNull();
  });

  it('getValue return value when exists', async () => {
    await db.doc('movies/1').set({ id: '1', title: 'Star Wars' });
    const movie = await service.getValue('1');
    expect(movie).toEqual({ id: '1', title: 'Star Wars' });
  });

  it('getValue return an array', async () => {
    await db.doc('movies/1').set({ title: 'Star Wars' });
    await db.doc('movies/2').set({ title: 'Lord of the ring' });
    const movies = await service.getValue();
    expect(movies.length).toEqual(2);
  });

  it('Firestore should be empty', async () => {
    const snap = await db.doc('movies/1').ref.get();
    expect(snap.exists).toBeFalsy();
  });

  // service.add()

  it('Add', async () => {
    await service.add({ id: '1', title: 'Star Wars '});
    const movie = await service.getValue('1');
    expect(movie).toEqual({ id: '1', title: 'Star Wars '});
  });

  it('Add many', async () => {
    await service.add([{ title: 'Star Wars' }, { title: 'Lord of the ring' }]);
    const movies = await service.getValue() as any[];
    expect(movies.length).toEqual(2);
  });

  // service.remove()

  it('Remove One', async () => {
    await service.add({ id: '1', title: 'Star Wars '});
    await service.remove('1');
    const movie = await service.getValue('1');
    expect(movie).toBeNull();
  });

  it('Remove many', async () => {
    await service.add([{ id: '1', title: 'Star Wars' }, { id: '2', title: 'Lord of the ring' }]);
    await service.remove(['1', '2']);
    const movies = await service.getValue();
    expect(movies.length).toEqual(0);
  });

  it('Remove all', async () => {
    await service.add([{ id: '1', title: 'Star Wars' }, { id: '2', title: 'Lord of the ring' }]);
    await service.removeAll();
    const movies = await service.getValue();
    expect(movies.length).toEqual(0);
  });

  // service.update()

  it('Update one', async () => {
    await service.add([{ id: '1', title: 'Star Wars' }, { id: '2', title: 'Lord of the ring' }]);
    await service.update('1', { title: 'Star Wars 2' });
    const movie = await service.getValue('1');
    expect(movie.title).toEqual('Star Wars 2');
  });

  it('SyncCollection', async () => {
    service.syncCollection().subscribe();
    await service.add({ id: '2', title: 'Star Wars '});
    const hasId = store['_value']().ids.includes('2');
    expect(hasId).toBeTruthy();
  });


});
