import { CollectionService } from './collection.service';
import { AngularFirestore } from '@angular/fire/firestore';
import { EntityStore } from '@datorama/akita';

describe('Collection Service Base Class', () => {
  let service: CollectionService<any, any>;
  let spyDB: jasmine.SpyObj<AngularFirestore>;
  let spyStore: jasmine.SpyObj<EntityStore<any, any, string>>;

  beforeEach(() => {
    spyDB = jasmine.createSpyObj('AngularFirestore', ['collection']);
    spyStore = jasmine.createSpyObj('EntityStore', ['idKey', 'setLoading', 'upsert', 'remove', 'update']);
    service = new CollectionService(spyDB, spyStore, 'path');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have the idKey of the store', () => {
    expect(service.path).toEqual('path');
  });

  it('should have the same collection than the db', () => {
    expect(service.collection).toEqual(spyDB.collection('path'));
  });

  it('should return the path for an id', () => {
    expect(service['getIdAndPath']({ id: '1' }))
      .toEqual({ id: '1', path: 'path/1'});
    expect(service['getIdAndPath']({ path: 'path/1' }))
      .toEqual({ id: '1', path: 'path/1'});
    expect(() => service['getIdAndPath']({ id: '1', path: 'path/1' }))
      .toThrowError('You should use either the key "id" OR "path".');
    expect(() => service['getIdAndPath']({}))
      .toThrowError('You should provide either an "id" OR a "path".');
  });

});
