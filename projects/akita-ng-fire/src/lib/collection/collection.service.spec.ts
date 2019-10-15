import { CollectionService } from './collection.service';
import { createServiceFactory, SpectatorService, SpyObject } from '@ngneat/spectator';
import { FirestoreSettingsToken, AngularFirestore } from '@angular/fire/firestore';
import { FirebaseOptionsToken } from '@angular/fire';
import { EntityStore, QueryEntity, StoreConfig, EntityState, ActiveState } from '@datorama/akita';
import { Injectable } from '@angular/core';
import { firestore } from 'firebase';
import { BehaviorSubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

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
  const collections = ['movies', 'col/doc/movies', 'movies/1/stakeholders', 'movies/2/stakeholders'];

  beforeEach(async () => {
    spectator = createService();
    service = spectator.service;
    store = spectator.get(MovieStore);
    query = spectator.get(MovieQuery);
    db = spectator.get(AngularFirestore);
    // Clear Database & store
    const snaps = await Promise.all(collections.map(col => db.collection(col).ref.get()));
    const docs = snaps.reduce((acc, snap) => acc.concat(snap.docs), [] as firestore.QueryDocumentSnapshot[]);
    await Promise.all(docs.filter(doc => doc.exists).map(({ ref }) => ref.delete()));
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

  it('getValue with Query', async () => {
    await db.doc('movies/1').set({ title: 'Star Wars' });
    await db.doc('movies/2').set({ title: 'Lord of the ring' });
    await db.doc('movies/3').set({ title: 'Lord of the ring' });
    const movies = await service.getValue(ref => ref.where('title', '==', 'Star Wars'));
    expect(movies.length).toEqual(1);
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

  // it('Update with callback', async () => {
  //   await service.add([{ id: '1', title: 'Star Wars' }]);
  //   await service.update('1', (m) =>  ({ title: m.title + ' 2'}));
  //   const movie = await service.getValue('1');
  //   expect(movie.title).toEqual('Star Wars 2');
  // });

  it('Update many', async () => {
    await service.add([{ id: '1', title: 'Star Wars' }, { id: '2', title: 'Lord of the ring' }]);
    await service.update(['1', '2'], { title: 'Star Wars 2' });
    const movies = await service.getValue(['1', '2']);
    const changes = movies.filter(movie => movie.title === 'Star Wars 2');
    expect(changes.length).toEqual(2);
  });

  // it('Update many with callback', async () => {
  //   await service.add([{ id: '1', title: 'Star Wars' }, { id: '2', title: 'Lord of the ring' }]);
  //   await service.update(['1', '2'], (m) =>  ({ title: m.title + ' 2'}));
  //   const movies = await service.getValue(['1', '2']);
  //   const changes = movies.filter(movie => movie.title.includes('2'));
  //   expect(changes.length).toEqual(2);
  // });

  // service.syncCollection().subscribe()

  it('SyncCollection', async () => {
    const sub = service.syncCollection().subscribe();
    await service.add({ id: '1', title: 'Star Wars'});
    const hasId = store['_value']().ids.includes('1');
    sub.unsubscribe();
    expect(hasId).toBeTruthy();
  });

  it('SyncCollection with queryFn', async () => {
    const sub = service.syncCollection(ref => ref.where('title', '==', 'Star Wars')).subscribe();
    await service.add([
      { title: 'Star Wars' },
      { title: 'Lord of the Rings' },
    ]);
    sub.unsubscribe();
    expect(query.getCount()).toEqual(1);
  });

  it('SyncCollection with path', async () => {
    const sub = service.syncCollection('col/doc/movies').subscribe();
    await db.collection('col/doc/movies').add({ title: 'Star Wars' });
    sub.unsubscribe();
    expect(query.getCount()).toEqual(1);
  });

  it('SyncCollection with path AND query', async () => {
    const sub = service.syncCollection('col/doc/movies', ref => ref.limit(1)).subscribe();
    await db.collection('col/doc/movies').add({ title: 'Star Wars' });
    await db.collection('col/doc/movies').add({ title: 'Lord of the Rings' });
    sub.unsubscribe();
    expect(query.getCount()).toEqual(1);
  });

  // service.syncCollectionGroup().subscribe()

  it('SyncCollectionGroup', async () => {
    const sub = service.syncCollectionGroup('stakeholders').subscribe();
    await db.collection('movies/1/stakeholders').add({ name: 'Uri' });
    await db.collection('movies/2/stakeholders').add({ name: 'Yann' });
    sub.unsubscribe();
    expect(query.getCount()).toEqual(2);
  });

  it('SyncCollectionGroup with Query', async () => {
    const sub = service.syncCollectionGroup('stakeholders', ref => ref.limit(1)).subscribe();
    await db.collection('movies/1/stakeholders').add({ name: 'Uri' });
    await db.collection('movies/2/stakeholders').add({ name: 'Yann' });
    sub.unsubscribe();
    expect(query.getCount()).toEqual(1);
  });

  // service.syncDoc({ id: '' }).subscribe()

  it('SyncDoc with id', async () => {
    const sub = service.syncDoc({ id: '2' }).subscribe();
    await service.add([
      { id: '1', title: 'Star Wars' },
      { id: '2', title: 'Lord of the Ring' }
    ]);
    sub.unsubscribe();
    expect(query.getCount()).toEqual(1);
  });

  it('SyncDoc with path', async () => {
    const sub = service.syncDoc({ path: 'col/doc/movies/1' }).subscribe();
    await db.doc('col/doc/movies/1').set({ title: 'Star Wars' });
    sub.unsubscribe();
    expect(query.getCount()).toEqual(1);
  });

  // service.syncActive().subscribe()

  it('SyncActive', async () => {
    const sub = service.syncActive({ id: '1' }).subscribe();
    await service.add([
      { id: '1', title: 'Star Wars' },
      { id: '2', title: 'Lord of the Ring' }
    ]);
    const { active, ids } = query.getValue();
    sub.unsubscribe();
    expect(ids.length).toEqual(1);
    expect(active).toEqual('1');
  });

  it('SyncActive many', async () => {
    const sub = service.syncActive(['1', '2'] as any).subscribe();
    await service.add([
      { id: '1', title: 'Star Wars' },
      { id: '2', title: 'Lord of the Ring' }
    ]);
    const { active, ids } = query.getValue();
    sub.unsubscribe();
    expect(ids.length).toEqual(2);
    expect(active).toEqual(['1', '2']);
  });

  // service.syncManyDocs().subscribe()

  it('SyncManyDocs', async () => {
    const sub = service.syncManyDocs(['1', '2']).subscribe();
    await service.add([
      { id: '1', title: 'Star Wars' },
      { id: '2', title: 'Lord of the Ring' },
      { id: '3', title: 'Harry Potter' },
    ]);
    sub.unsubscribe();
    expect(query.getCount()).toEqual(2);
  });

  it('SyncManyDocs in observable', async () => {
    const ids$ = new BehaviorSubject([]);
    const sub = ids$.pipe(
      switchMap(ids => service.syncManyDocs(ids))
    ).subscribe();
    await service.add([
      { id: '1', title: 'Star Wars' },
      { id: '2', title: 'Lord of the Ring' },
      { id: '3', title: 'Harry Potter' },
    ]);
    expect(query.getCount()).toEqual(0);
    ids$.next(['1']);
    expect(query.getCount()).toEqual(1);
    // ids$.next(['2', '3']);
    // expect(query.getValue().ids).toEqual(['2', '3']);
    // await service.remove('2');
    // expect(query.getValue().ids).toEqual(['3']);
    // await service.add({ id: '2', title: 'Lord of the Ring' });
    // expect(query.getValue().ids).toEqual(['2', '3']);
    sub.unsubscribe();
  });
});
