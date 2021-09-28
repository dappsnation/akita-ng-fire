import { Injectable } from '@angular/core';
import { <%= classify(name) %>Store, <%= classify(name) %>State } from './<%= dasherize(name) %>.store';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { CollectionConfig, CollectionService } from 'akita-ng-fire';

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: '<%= dasherize(name) =>' })
export class <%= classify(name) %>Service extends CollectionService<<%= classify(name) %>State> {

  constructor(store: <%= classify(name) %>Store) {
    super(store);
  }

}
