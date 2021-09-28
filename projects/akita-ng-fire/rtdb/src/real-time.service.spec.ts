import { RealTimeService } from './real-time.service';
import { createServiceFactory, SpectatorService, SpyObject } from '@ngneat/spectator';
import { EntityStore, QueryEntity, StoreConfig, EntityState, ActiveState } from '@datorama/akita';
import { Injectable } from '@angular/core';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireDatabase, URL } from '@angular/fire/compat/database';
import { Subscription } from 'rxjs';
import { RealTimeConfig } from './real-time.config';

interface Vehicle {
  title: string;
  id?: string;
}

interface VehicleState extends EntityState<Vehicle, string>, ActiveState<string> { }

@Injectable()
@StoreConfig({ name: 'vehicles', resettable: true, idKey: 'customIdKey' })
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
@RealTimeConfig({ nodeName: 'vehicles' })
class VehicleService extends RealTimeService<VehicleState> {
  constructor(store: VehicleStore, db: AngularFireDatabase) {
    super(store, 'vehicles', db);
  }
  formatToDatabase(e: Vehicle) {
    Object.assign(e, { testProp: true });
    return e;
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
        useValue: 'http://localhost:9000/?ns=akita-ng-fire-f93f0'
      },
    ]
  });

  beforeEach(async () => {
    spectator = createService();
    service = spectator.service;
    store = spectator.inject(VehicleStore);
    query = spectator.inject(VehicleQuery);
    db = spectator.inject(AngularFireDatabase);
    // Clear Database & store
    await db.database.ref('vehicles').remove();
    subs.push(service.syncNodeWithStore().subscribe());
    store.reset();
  });

  afterEach(() => {
    subs.forEach(sub => sub.unsubscribe());
  });

  it('store should not hold any entities', () => {
    const value = store.getValue();
    expect(value.entities).toEqual({});
  });

  it('should add one vehicle to the database', async () => {
    const id = await service.add({ title: 'Tesla' });
    expect(query.getEntity(id).title).toBe('Tesla');
  });

  it('should update the value with the provided one', async () => {
    const id = await service.add({ title: 'BMW' });
    await service.add({ title: 'Tesla' });
    await service.update({ title: 'Porsche', customIdKey: id } as any);
    expect(query.getEntity(id).title).toBe('Porsche');
  });

  it('should update when provided value is an array', async () => {
    const id = await service.add({ title: 'BMW' });
    const idTwo = await service.add({ title: 'Tesla' });
    await service.update(
      [{ title: 'Porsche', customIdKey: id },
      { title: 'Audi', customIdKey: idTwo }
      ] as any);
    expect(query.getEntity(id).title).toBe('Porsche');
  });

  it('should use the provided add that was referenced in the id key property', async () => {
    await service.add({ title: 'Renault', customIdKey: '123' } as any);
    expect(query.getEntity('123')['customIdKey']).toBe('123');
  });

  it('should add array value', async () => {
    const values = [{ title: 'Smart' }, { title: 'Renault' }];
    const ids = await service.add(values);
    ids.forEach((id, index) => expect(query.getEntity(id).title).toBe(values[index].title));
  });

  it('should remove all entities from the node', async () => {
    const values = [{ title: 'Smart' }, { title: 'Renault' }];
    await service.add(values);
    await service.clearNode();
    expect(query.getValue().entities).toEqual({});
  });

  it('should call formatToDatabase once if one value was added', async () => {
    const id = await service.add({ title: 'Opel' });

  });
});
