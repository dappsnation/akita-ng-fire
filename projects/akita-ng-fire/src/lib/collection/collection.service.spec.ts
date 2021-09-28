import { CollectionService } from './collection.service';
import { createServiceFactory, SpectatorService, SpyObject } from '@ngneat/spectator';
import { AngularFirestore, SETTINGS } from '@angular/fire/compat/firestore';
import { EntityStore, QueryEntity, StoreConfig, EntityState, ActiveState } from '@datorama/akita';
import { Injectable } from '@angular/core';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { interval } from 'rxjs';
import { switchMap, map, finalize, takeWhile } from 'rxjs/operators';
import { AngularFireModule } from '@angular/fire/compat';

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
      },
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
    const docs = snaps.reduce((acc, snap) => acc.concat(snap.docs), [] as firebase.firestore.QueryDocumentSnapshot[]);
    await Promise.all(docs.filter(doc => doc.exists).map(({ ref }) => ref.delete()));
    store.set({ entities: {}, ids: [] });
  });

  it('should exist', () => {
    expect(spectator.service).toBeTruthy();
  });

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

  it('Add', async () => {
    await service.add({ id: '1', title: 'Star Wars' });
    const movie = await service.getValue('1');
    expect(movie).toEqual({ id: '1', title: 'Star Wars' });
  });

  it('Add movies and verify that ids are set correctly', async () => {
    const ids = await service.add([{ id: '1', title: 'Star Wars' },
    { id: '2', title: 'Lord of the ring' }]);
    expect(ids).toEqual(['1', '2']);
  });

  it('Add movies and should not alter the ids when there is no id key in state', async () => {
    const ids = await service.add([{ uid: '1', title: 'Star Wars' },
    { uid: '2', title: 'Lord of the ring' }]);
    expect(ids).not.toEqual(['1', '2']);
  });

  it('Add many', async () => {
    await service.add([{ title: 'Star Wars' }, { title: 'Lord of the ring' }]);
    const movies = await service.getValue() as any[];
    expect(movies.length).toEqual(2);
  });

  it('Remove One', async () => {
    await service.add({ id: '1', title: 'Star Wars ' });
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

  it('Update one', async () => {
    await service.add([{ id: '1', title: 'Star Wars' }, { id: '2', title: 'Lord of the ring' }]);
    await service.update('1', { title: 'Star Wars 2' });
    const movie = await service.getValue('1');
    expect(movie.title).toEqual('Star Wars 2');
  });

  it('Update with callback', async () => {
    await service.add({ id: '1', title: 'Star Wars' });
    await service.update('1', (m) => ({ title: m.title + ' 2' }));
    const movie = await service.getValue('1');
    expect(movie.title).toEqual('Star Wars 2');
  });

  it('Update many with ids', async () => {
    await service.add([{ id: '1', title: 'Star Wars' }, { id: '2', title: 'Lord of the ring' }]);
    await service.update(['1', '2'], { title: 'Star Wars 2' });
    const movies = await service.getValue(['1', '2']);
    const changes = movies.filter(movie => movie.title === 'Star Wars 2');
    expect(changes.length).toEqual(2);
  });

  it('Update many with object array', async () => {
    await service.add([
      { id: '1', title: 'Star Wars' },
      { id: '2', title: 'Lord of the ring' }
    ]);
    await service.update([
      { id: '1', title: 'Star Wars 2' },
      { id: '2', title: 'Lord of the ring 2' }
    ]);
    const movies = await service.getValue(['1', '2']);
    expect(movies[0].title).toEqual('Star Wars 2');
    expect(movies[1].title).toEqual('Lord of the ring 2');
  });

  // service.syncCollection().subscribe()

  it('SyncCollection', async () => {
    const sub = service.syncCollection().subscribe();
    await service.add({ id: '1', title: 'Star Wars' });
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

  it('SyncCollection with queryFn AND params', async () => {
    Object.defineProperty(service, 'path', {
      get: () => 'movies/:movieId/stakeholders'
    });
    const sub = service.syncCollection(ref => ref.where('status', '==', 'pending'), { params: { movieId: '1' } }).subscribe();
    await db.collection('movies/1/stakeholders').add({ status: 'pending' });
    await db.collection('movies/1/stakeholders').add({ status: 'accepted' });
    await db.collection('movies/2/stakeholders').add({ status: 'pending' });
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

  it('SyncManyDocs with ids updated', async (done) => {
    await service.add([
      { id: '1', title: 'Star Wars' },
      { id: '2', title: 'Lord of the Ring' },
      { id: '3', title: 'Harry Potter' },
    ]);
    const array = [['2'], ['2', '3'], ['1']];
    let i = 0;
    interval(100).pipe(
      finalize(() => done()),
      takeWhile(index => index !== array.length),
      map((index) => array[index]),
      switchMap(ids => service.syncManyDocs(ids)),
      map(() => query.getCount()),
    ).subscribe(size => {
      expect(size).toEqual(array[i].length);
      i++;
    });
  });

  it('SyncManyDocs with firestore updates', async (done) => {
    await service.add([
      { id: '1', title: 'Star Wars' },
      { id: '2', title: 'Lord of the Ring' },
      { id: '3', title: 'Harry Potter' },
    ]);
    let i = 0;
    const expected = [3, 2, 3, 3, 2, 1];
    service.syncManyDocs(['1', '2', '3']).pipe(
      finalize(() => done()),
      takeWhile(() => i !== expected.length - 1),
      map(() => query.getCount()),
    ).subscribe(size => {
      expect(size).toEqual(expected[i]);
      i++;
    });
    setTimeout(() => service.remove('1'), 500);
    setTimeout(() => service.add({ id: '1', title: 'Star Wars 2' }), 1000);
    setTimeout(() => service.update('1', { title: 'Star Wars' }), 1500);
    // This creates 2 events from firestore (remove '1' and remove '2')
    setTimeout(() => service.remove(['1', '2']), 2000);
  });
});
