import { RealTimeService } from './real-time.service';
import { createServiceFactory, SpectatorService, SpyObject } from '@ngneat/spectator';
import { AngularFirestore, SETTINGS } from '@angular/fire/firestore';
import { EntityStore, QueryEntity, StoreConfig, EntityState, ActiveState } from '@datorama/akita';
import { Injectable } from '@angular/core';
import { firestore } from 'firebase/app';
import 'firebase/firestore';
import { AngularFireModule } from '@angular/fire';
import { AngularFireDatabase } from '@angular/fire/database';

interface Movie {
  title: string;
  id?: string;
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
class MovieService extends RealTimeService<MovieState> {
  constructor(store: MovieStore, db: AngularFireDatabase) {
    super(store, 'vehicle', db);
  }
}

describe('RealTimeService', () => {
  let spectator: SpectatorService<MovieService>;
  let service: MovieService;
  let store: SpyObject<MovieStore>;
  let query: SpyObject<MovieQuery>;
  let db: AngularFireDatabase;

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
        useValue: { host: 'localhost:9000', ssl: false }
      },
    ]
  });
  const collection = 'vehicles';

  beforeEach(async () => {
    spectator = createService();
    service = spectator.service;
    store = spectator.get(MovieStore);
    query = spectator.get(MovieQuery);
    db = spectator.get(AngularFireDatabase);
    // Clear Database & store
    const snaps = await db.list(collection).remove();
  });

  it('Store should be empty', () => {
    const value = store.getValue();
    console.log(value)
    expect(value).toBe(null)
  })

});
