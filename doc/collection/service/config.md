# Collection Service - Configuration
There is two ways to configure your `CollectionService` : 
- With the `CollectionConfig` decorator.
- By overriding default `getter` of `CollectionService`.

## CollectionConfig
`CollectionConfig` gives you an elegant way to define the configuration of your service : 

```typescript
@CollectionConfig({
  path: 'movies',
  idKey: 'name'
})
```

`CollectionConfig` accept a `Partial<CollectionOptions>` object as parameter that looks like that : 
```typescript
export interface CollectionOptions {
  path: string; // The path of the collection in Firestore
  idKey: string; // The key to use as an id for the document in Firestore. Default is store.idKey
}
```


## Path Getter
Sometime the path is dynamic. If your service is targetting a subcollection, the path needs to know what is the id of the parent document.

In this case you'll need to override the `path` getter inside the class. Let's see how to do that with a `Stakeholder` of a specific movie :

```typescript
@Injectable({ providedIn: 'root' })
export class StakeholderService extends CollectionService<StakeholderState> {
  constructor(
    db: AngularFirestore,
    store: StakeholderStore,
    private movieQuery: MovieQuery
  ) {
    super(db, store);
  }

  get path() {
    const movieId = this.movieQuery.getActiveId();
    return `movies/${movieId}/stakeholders`;
  }
}
```
1. We do not need the `CollectionConfig` here.
2. We inject `MovieQuery`, the query of the parent collection.
3. We override the `path` getter by getting the active movie Id.


### Path Observable
`path` can also be an observable. That way, `sync` is always going to be up-to-date with the state of your app.

To do that use `selectActiveId` instead of `getActiveId` :
```typescript
export class StakeholderService extends CollectionService<StakeholderState> {
  ...
  get path() {
    return this.movieQuery.selectActiveId().pipe(
      map(movieId => `movies/${movieId}/stakeholders`)
    );
  }
}
```
