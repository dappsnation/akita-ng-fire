import { TestBed } from '@angular/core/testing';

import { CollectionService } from './collection.service';

describe('AkitaFirebaseService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CollectionService<any, any> = TestBed.get(CollectionService);
    expect(service).toBeTruthy();
  });
});
