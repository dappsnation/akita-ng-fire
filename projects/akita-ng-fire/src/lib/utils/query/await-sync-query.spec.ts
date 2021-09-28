import { CollectionService } from '../../collection/collection.service';
import { createServiceFactory, SpectatorService, SpyObject } from '@ngneat/spectator';
import { AngularFirestore, SETTINGS } from '@angular/fire/compat/firestore';
import { EntityStore, QueryEntity, StoreConfig, EntityState, ActiveState } from '@datorama/akita';
import { Injectable } from '@angular/core';
import { awaitSyncQuery } from './await-sync-query';
import { AngularFireModule } from '@angular/fire/compat';

interface Organization {
  id?: string;
  name: string;
}

interface Stakeholder {
  id?: string;
  orgId?: string;
  organization: Organization;
}

interface Movie {
  id?: string;
  title: string;
  stakeholders: Stakeholder[];
}

interface MovieState extends EntityState<Movie, string>, ActiveState<string> { }

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
  syncQuery = awaitSyncQuery.bind(this);
  constructor(store: MovieStore, db: AngularFirestore) {
    super(store, 'movies', db);
  }
}

const initialDB = {
  'movies/1': { id: '1', title: 'Star Wars 1' },
  'movies/2': { id: '2', title: 'Star Wars 2' },
  'movies/3': { id: '3', title: 'Star Wars 3' },
  'movies/1/stakeholders/1': { id: '1', orgId: '1' },
  'movies/1/stakeholders/2': { id: '2', orgId: '2' },
  'movies/2/stakeholders/3': { id: '3', orgId: '1' },
  'organizations/1': { id: '1', name: 'Bob1' },
  'organizations/2': { id: '2', name: 'Bob2' }
};

describe('CollectionService', () => {
  let spectator: SpectatorService<MovieService>;
  let service: MovieService;
  let store: SpyObject<MovieStore>;
  let query: SpyObject<MovieQuery>;
  let db: AngularFirestore;

  const createService = createServiceFactory({
    service: MovieService,
    imports: [AngularFireModule.initializeApp({
      apiKey: "AIzaSyD8fRfGLDsh8u8pXoKwzxiDHMqg-b1IpN0",
      authDomain: "akita-ng-fire-f93f0.firebaseapp.com",
      databaseURL: "https://akita-ng-fire-f93f0.firebaseio.com",
      projectId: "akita-ng-fire-f93f0",
      storageBucket: "akita-ng-fire-f93f0.appspot.com",
      messagingSenderId: "561612331472",
      appId: "1:561612331472:web:307acb3b5d26ec0cb8c1d5"
    })],
    providers: [
      MovieStore,
      MovieQuery,
      AngularFirestore,
      {
        provide: SETTINGS,
        useValue: { host: 'localhost:8080', ssl: false }
      }
    ]
  });

  /** Use this function after syncCollection to avoid timing issues with observables */
  function setUpDB() {
    return Promise.all(Object.keys(initialDB).map(path => db.doc(path).set(initialDB[path])));
  }

  beforeEach(async () => {
    spectator = createService();
    db = spectator.get(AngularFirestore);
    store = spectator.get(MovieStore);
    query = spectator.get(MovieQuery);
    service = spectator.service;
    // Clear Database & store
    store.set({ entities: {}, ids: [] });
  });

  it('simple query', async () => {
    const sub = awaitSyncQuery.call(service, { path: 'movies' }).subscribe();
    await setUpDB();
    sub.unsubscribe();
    expect(query.getCount()).toBe(3);
  });

  it('query with queryFn', async () => {
    const sub = awaitSyncQuery.call(service, {
      path: 'movies',
      queryFn: ref => ref.where('id', '==', '1')
    }).subscribe();
    await setUpDB();
    sub.unsubscribe();
    expect(query.getCount()).toBe(1);
  });

  it('query with queryFn that do not match document', async () => {
    const sub = awaitSyncQuery.call(service, {
      path: 'movies',
      queryFn: ref => ref.where('id', '==', '5')
    }).subscribe();
    await setUpDB();
    sub.unsubscribe();
    expect(query.getCount()).toBe(0);
  });

  // Empty collections

  it('set empty array when collection is empty', async (done) => {
    const sub = service.syncQuery({ path: 'empty' }).subscribe(() => {
      expect(query.getCount()).toBe(0);
      done();
    });
    await setUpDB();
    sub.unsubscribe();
    done();
  });

  it('set empty array when query return no elements', async (done) => {
    const sub = service.syncQuery({
      path: 'movies',
      queryFn: ref => ref.where('name', '==', 'Lord of the Ring')
    }).subscribe(() => {
      expect(query.getCount()).toBe(0);
      done();
    });
    await setUpDB();
    sub.unsubscribe();
    done();
  });
});
