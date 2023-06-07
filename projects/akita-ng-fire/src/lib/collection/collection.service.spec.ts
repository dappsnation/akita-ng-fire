// noinspection ES6PreferShortImport
import { Injectable } from '@angular/core';
import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import {
  addDoc,
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  DocumentSnapshot,
  enableIndexedDbPersistence,
  Firestore,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  provideFirestore,
  setDoc,
  SnapshotMetadata,
  where
} from '@angular/fire/firestore';
import { ActiveState, EntityState, EntityStore, QueryEntity, StoreConfig } from '@datorama/akita';
import { createServiceFactory, SpectatorService, SpyObject } from '@ngneat/spectator';
import { firstValueFrom, interval, lastValueFrom } from 'rxjs';
import { first, map, switchMap, take, tap } from 'rxjs/operators';
import { CollectionService } from './collection.service';

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
  constructor(store: MovieStore, db: Firestore) {
    super(store, 'movies', db);
  }
}

describe('CollectionService', () => {
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
      }, 'collection service app')),
      provideFirestore(() => {
        const firestore = getFirestore(getApp('collection service app'));

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
  const collections = ['movies', 'col/doc/movies', 'movies/1/stakeholders', 'movies/2/stakeholders'];

  beforeEach(async () => {
    spectator = createService();
    service = spectator.service;
    store = spectator.inject(MovieStore);
    query = spectator.inject(MovieQuery);
    db = spectator.inject(Firestore);
    // Clear Database & store
    const snaps = await Promise.all(collections.map(col => getDocs(collection(db, col))));
    const docs = snaps.reduce((acc, snap) => acc.concat(snap.docs), [] as DocumentSnapshot[]);
    await Promise.all(docs.filter(docSnapshot => docSnapshot.exists()).map(snapshot => deleteDoc(snapshot.ref)));
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
    await setDoc(doc(db, 'movies/1'), { id: '1', title: 'Star Wars' });
    const movie = await service.getValue('1');
    expect(movie).toEqual({ id: '1', title: 'Star Wars' });
  });

  it('getValue with Query', async () => {
    await setDoc(doc(db, 'movies/1'), { title: 'Star Wars' });
    await setDoc(doc(db, 'movies/2'), { title: 'Lord of the ring' });
    await setDoc(doc(db, 'movies/3'), { title: 'Lord of the ring' });
    const movies = await service.getValue([where('title', '==', 'Star Wars')]);
    expect(movies.length).toEqual(1);
  });

  it('getValue return an array', async () => {
    await setDoc(doc(db, 'movies/1'), { title: 'Star Wars' });
    await setDoc(doc(db, 'movies/2'), { title: 'Lord of the ring' });
    const movies = await service.getValue();
    expect(movies.length).toEqual(2);
  });

  it('Firestore should be empty', async () => {
    const snap = await getDoc(doc(db, 'movies/1'));
    expect(snap.exists()).toBeFalsy();
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


  it('SyncCollection store loading', async () => {
    let firstValue = await firstValueFrom(service.syncCollection());
    expect(firstValue).toEqual([]);
    expect(store['_value']().loading).toBeFalsy();
    const sub = service.syncCollection().subscribe();
    await service.add({ id: '1', title: 'Star Wars' });
    const hasId = store['_value']().ids.includes('1');
    sub.unsubscribe();
    expect(hasId).toBeTruthy();
    expect(store['_value']().loading).toBeFalsy();
  });

  it('SyncCollection with query constraints', async () => {
    const sub = service.syncCollection([where('title', '==', 'Star Wars')]).subscribe();
    await service.add([
      { title: 'Star Wars' },
      { title: 'Lord of the Rings' },
    ]);
    sub.unsubscribe();
    expect(query.getCount()).toEqual(1);
  });

  it('SyncCollection with path', async () => {
    const sub = service.syncCollection('col/doc/movies').subscribe();
    await addDoc(collection(db, 'col/doc/movies'), { title: 'Star Wars' });
    sub.unsubscribe();
    expect(query.getCount()).toEqual(1);
  });

  it('SyncCollection with path AND query', async () => {
    const sub = service.syncCollection('col/doc/movies', [limit(1)]).subscribe();
    await addDoc(collection(db, 'col/doc/movies'), { title: 'Star Wars' });
    await addDoc(collection(db, 'col/doc/movies'), { title: 'Lord of the Rings' });
    sub.unsubscribe();
    expect(query.getCount()).toEqual(1);
  });

  it('SyncCollection with query constraints AND params', async () => {
    Object.defineProperty(service, 'path', {
      get: () => 'movies/:movieId/stakeholders'
    });
    const sub = service.syncCollection([where('status', '==', 'pending')], { params: { movieId: '1' } }).subscribe();
    await addDoc(collection(db, 'movies/1/stakeholders'), { status: 'pending' });
    await addDoc(collection(db, 'movies/1/stakeholders'), { status: 'accepted' });
    await addDoc(collection(db, 'movies/2/stakeholders'), { status: 'pending' });
    sub.unsubscribe();
    expect(query.getCount()).toEqual(1);
  });

  it('SyncCollectionGroup', async () => {
    const sub = service.syncCollectionGroup('stakeholders').subscribe();
    await addDoc(collection(db, 'movies/1/stakeholders'), { name: 'Uri' });
    await addDoc(collection(db, 'movies/2/stakeholders'), { name: 'Yann' });
    sub.unsubscribe();
    expect(query.getCount()).toEqual(2);
  });

  it('SyncCollectionGroup with Query', async () => {
    const sub = service.syncCollectionGroup('stakeholders', [limit(1)]).subscribe();
    await addDoc(collection(db, 'movies/1/stakeholders'), { name: 'Uri' });
    await addDoc(collection(db, 'movies/2/stakeholders'), { name: 'Yann' });
    sub.unsubscribe();
    expect(query.getCount()).toEqual(1);
  });

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
    await setDoc(doc(db, 'col/doc/movies/1'), { title: 'Star Wars' });
    sub.unsubscribe();
    expect(query.getCount()).toEqual(1);
  });

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

  it('SyncManyDocs with ids updated', async () => {
    await service.add([
      { id: '1', title: 'Star Wars' },
      { id: '2', title: 'Lord of the Ring' },
      { id: '3', title: 'Harry Potter' },
    ]);
    const array = [['2'], ['2', '3'], ['1']];
    let i = 0;
    const syncManyPromise = lastValueFrom(interval(100).pipe(
      take(array.length),
      map((index) => array[index]),
      switchMap(ids => service.syncManyDocs(ids).pipe(first())),
      tap(() => {
        const size = query.getCount();
        expect(size).toEqual(array[i].length);
        i++;
      })
    ));

    await syncManyPromise;
  });

  it('SyncManyDocs with firestore updates', async () => {
    await service.add([
      { id: '1', title: 'Star Wars' },
      { id: '2', title: 'Lord of the Ring' },
      { id: '3', title: 'Harry Potter' },
    ]);
    let i = 0;
    const expected = [3, 2, 3, 3, 2, 1];
    const syncManyDocsPromise = lastValueFrom(service.syncManyDocs(['1', '2', '3']).pipe(
      take(expected.length),
      tap(() => {
        const size = query.getCount();
        expect(size).toEqual(expected[i]);
        i++;
      })
    ));

    setTimeout(() => service.remove('1'), 500);
    setTimeout(() => service.add({ id: '1', title: 'Star Wars 2' }), 1000);
    setTimeout(() => service.update('1', { title: 'Star Wars' }), 1500);
    // This creates 2 events from firestore (remove '1' and remove '2')
    setTimeout(() => service.remove(['1', '2']), 2000);

    await syncManyDocsPromise;
  });

  it('should emit metadata changes', async () => {
    service['includeMetadataChanges'] = true;
    const movie: Movie = { id: '1', title: 'Star Wars' };
    await service.add([
      movie
    ]);
    let callCount = 0;
    const expectedResults: {data: Movie, metadata: Partial<SnapshotMetadata>}[] = [
      {data: movie, metadata: {hasPendingWrites: false, fromCache: true}},
      {data: movie, metadata: {hasPendingWrites: false, fromCache: false}},
      {data: undefined, metadata: {hasPendingWrites: false, fromCache: false}}
    ];
    const syncManyDocsPromise = lastValueFrom(service.syncManyDocs(['1']).pipe(
      take(expectedResults.length),
      tap((snapshots: DocumentSnapshot[]) => {
        const expectedResult = expectedResults[callCount];
        const snap = snapshots[0];
        expect(snap.data()).toEqual(expectedResult.data);
        expect(snap.metadata).toEqual(jasmine.objectContaining(expectedResult.metadata));
        callCount++;
      })
    ));

    setTimeout(() => service.remove('1'), 500);

    await syncManyDocsPromise;
  });

});
