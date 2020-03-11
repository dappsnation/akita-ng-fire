import { CollectionService } from '../../collection/collection.service';
import { createServiceFactory, SpectatorService, SpyObject } from '@ngneat/spectator';
import { FirestoreSettingsToken, AngularFirestore } from '@angular/fire/firestore';
import { FirebaseOptionsToken } from '@angular/fire';
import { EntityStore, QueryEntity, StoreConfig, EntityState, ActiveState } from '@datorama/akita';
import { Injectable } from '@angular/core';
import { awaitSyncQuery } from './await-sync-query';

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

  it('subquery object', async () => {
    const sub = service.syncQuery<MovieService, Movie>({
      path: 'movies/1',
      stakeholders: [{
        organization: { name: 'Bob' }
      }]
    }).subscribe();
    await setUpDB();
    sub.unsubscribe();
    const stakeholders = query.getValue().entities['1'].stakeholders;
    expect(stakeholders.length).toBe(1);
    expect(stakeholders[0].organization.name).toBe('Bob');
  });

  it('subquery function sting', async () => {
    const sub = service.syncQuery<MovieService, Movie>({
      path: 'movies/1',
      stakeholders: (m) => `movies/${m.id}/stakeholders`
    }).subscribe();
    await setUpDB();
    sub.unsubscribe();
    expect(query.getValue().entities['1'].stakeholders.length).toBe(2);
  });

  it('subquery function object', async () => {
    const sub = service.syncQuery<MovieService, Movie>({
      path: 'movies/1',
      stakeholders: (m) => ({
        path: `movies/${m.id}/stakeholders`,
        queryFn: ref => ref.where('orgId', '==', '1')
      })
    }).subscribe();
    await setUpDB();
    sub.unsubscribe();
    expect(query.getValue().entities['1'].stakeholders.length).toBe(1);
  });

  it('deep subquery object', async () => {
    const sub = service.syncQuery<MovieService, Movie>({
      path: 'movies/1',
      stakeholders: (m) => ({
        path: `movies/${m.id}/stakeholders`,
        queryFn: ref => ref.where('orgId', '==', '1'),
        organization: ({ orgId }) => `organizations/${orgId}`
      })
    }).subscribe();
    await setUpDB();
    sub.unsubscribe();
    const stakeholders = query.getValue().entities['1'].stakeholders;
    const organization = stakeholders[0].organization;
    expect(query.getCount()).toBe(1);
    expect(query.getValue().entities['1'].stakeholders.length).toBe(1);
    expect(organization.name).toBe('Bob1');
  });
});
