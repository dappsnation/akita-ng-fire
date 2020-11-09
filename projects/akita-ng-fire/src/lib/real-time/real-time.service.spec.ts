import { RealTimeService } from './real-time.service';
import { createServiceFactory, SpectatorService, SpyObject } from '@ngneat/spectator';
import { EntityStore, QueryEntity, StoreConfig, EntityState, ActiveState } from '@datorama/akita';
import { Injectable } from '@angular/core';
import { AngularFireModule } from '@angular/fire';
import { AngularFireDatabase, URL } from '@angular/fire/database';
import { Subscription } from 'rxjs';
import { SETTINGS } from '@angular/fire/firestore';

interface Vehicle {
  title: string;
  id?: string;
}

interface VehicleState extends EntityState<Vehicle, string>, ActiveState<string> { }

@Injectable()
@StoreConfig({ name: 'vehicle' })
class VehicleStore extends EntityStore<VehicleState> {
  constructor() {
    super();
  }
}

@Injectable()
class VehicleQuery extends QueryEntity<VehicleState> {
  constructor(store: VehicleStore) {
    super(store);
  }
}

@Injectable()
class VehicleService extends RealTimeService<VehicleState> {
  constructor(store: VehicleStore, db: AngularFireDatabase) {
    super(store, 'vehicle', db);
  }
}

describe('RealTimeService', () => {
  let spectator: SpectatorService<VehicleService>;
  let service: VehicleService;
  let store: SpyObject<VehicleStore>;
  let query: SpyObject<VehicleQuery>;
  let db: AngularFireDatabase;
  const subs: Subscription[] = [];

  const createService = createServiceFactory({
    service: VehicleService,
    imports: [AngularFireModule.initializeApp({
      apiKey: 'AIzaSyD8fRfGLDsh8u8pXoKwzxiDHMqg-b1IpN0',
      authDomain: 'akita-ng-fire-f93f0.firebaseapp.com',
      databaseURL: 'https://akita-ng-fire-f93f0.firebaseio.com',
      projectId: 'akita-ng-fire-f93f0',
      storageBucket: 'akita-ng-fire-f93f0.appspot.com',
      messagingSenderId: '561612331472',
      appId: '1:561612331472:web:307acb3b5d26ec0cb8c1d5'
    })],
    providers: [
      VehicleStore,
      VehicleQuery,
      AngularFireDatabase,
      /* Use firebase emulator */
      {
        provide: URL,
        useValue: 'localhost:8080'
      },
    ]
  });
  const collection = 'vehicles';

  beforeEach(async () => {
    spectator = createService();
    service = spectator.service;
    store = spectator.inject(VehicleStore);
    query = spectator.inject(VehicleQuery);
    db = spectator.inject(AngularFireDatabase);
    // Clear Database & store
    await db.list(collection).remove();
  });

  afterAll(() => {
    subs.forEach(sub => sub.unsubscribe());
  });

  it('store should not hold any entities', () => {
    const value = store.getValue();
    expect(value.entities).toEqual({});
  });

  it('should add one vehicle to the database', async () => {
    subs.push(service.syncNodeWithStore().subscribe());
    const txResult = await service.add({ id: '1', title: 'Tesla' });
    expect(query.getEntity(txResult.snapshot.key).title).toBe('Tesla');
  });

});
