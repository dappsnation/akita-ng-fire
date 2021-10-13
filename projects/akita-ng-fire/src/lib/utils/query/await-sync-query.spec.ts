// noinspection ES6PreferShortImport

import {CollectionService} from '../../collection/collection.service';
import {createServiceFactory, SpectatorService, SpyObject} from '@ngneat/spectator';
import {ActiveState, EntityState, EntityStore, QueryEntity, StoreConfig} from '@datorama/akita';
import {Injectable} from '@angular/core';
import {awaitSyncQuery} from './await-sync-query';
import {getApp, initializeApp, provideFirebaseApp} from '@angular/fire/app';
import {
  connectFirestoreEmulator,
  doc,
  enableIndexedDbPersistence,
  Firestore,
  getFirestore,
  provideFirestore,
  setDoc,
  where
} from '@angular/fire/firestore';
import {first} from 'rxjs/operators';

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
  constructor(store: MovieStore, db: Firestore) {
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

describe('await-sync-query', () => {
  let spectator: SpectatorService<MovieService>;
  let service: MovieService;
  let store: SpyObject<MovieStore>;
  let query: SpyObject<MovieQuery>;
  let db: Firestore;

  const createService = createServiceFactory({
    service: MovieService,
    imports: [
      provideFirebaseApp(() => initializeApp({
        apiKey: 'AIzaSyD8fRfGLDsh8u8pXoKwzxiDHMqg-b1IpN0',
        authDomain: 'akita-ng-fire-f93f0.firebaseapp.com',
        databaseURL: 'https://akita-ng-fire-f93f0.firebaseio.com',
        projectId: 'akita-ng-fire-f93f0',
        storageBucket: 'akita-ng-fire-f93f0.appspot.com',
        messagingSenderId: '561612331472',
        appId: '1:561612331472:web:307acb3b5d26ec0cb8c1d5'
      }, 'await-sync-query app')),
      provideFirestore(() => {
        const firestore = getFirestore(getApp('await-sync-query app'));

        if (!firestore['_initialized'])
        {
          connectFirestoreEmulator(firestore, 'localhost', 8080);
          enableIndexedDbPersistence(firestore);
        }

        return firestore;
      })
    ],
    providers: [
      MovieStore,
      MovieQuery
    ]
  });

  /** Use this function after syncCollection to avoid timing issues with observables */
  function setUpDB() {
    return Promise.all(Object.keys(initialDB).map(path => setDoc(doc(db, path), initialDB[path])));
  }

  beforeEach(async () => {
    spectator = createService();
    db = spectator.inject(Firestore);
    store = spectator.inject(MovieStore);
    query = spectator.inject(MovieQuery);
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

  it('query with query constraints', async () => {
    const sub = awaitSyncQuery.call(service, {
      path: 'movies',
      queryConstraints: [where('id', '==', '1')]
    }).subscribe();
    await setUpDB();
    sub.unsubscribe();
    expect(query.getCount()).toBe(1);
  });

  it('query with query constraints that do not match document', async () => {
    const sub = awaitSyncQuery.call(service, {
      path: 'movies',
      queryConstraints: [where('id', '==', '5')]
    }).subscribe();
    await setUpDB();
    sub.unsubscribe();
    expect(query.getCount()).toBe(0);
  });

  // Empty collections

  it('set empty array when collection is empty', async () => {
    const syncQueryPromise = service.syncQuery({
        path: 'empty'
    })
      .pipe(first())
      .toPromise();
    await setUpDB();
    await syncQueryPromise;
    expect(query.getCount()).toBe(0);
  });

  it('set empty array when query return no elements', async () => {
    const syncQueryPromise = service.syncQuery({
      path: 'movies',
      queryConstraints: [where('name', '==', 'Lord of the Ring')]
    })
      .pipe(first())
      .toPromise();
    await setUpDB();
    await syncQueryPromise;
    expect(query.getCount()).toBe(0);
  });
});
