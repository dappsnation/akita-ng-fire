# Collection Service - Configuration

There are two ways to configure your `CollectionService`:

- With the `CollectionConfig` decorator.
- By overriding default `getter` of `CollectionService`.

## CollectionConfig

`CollectionConfig` gives you an elegant way to define the configuration of your service:

```typescript
@CollectionConfig({
  path: 'movies',
  idKey: 'name',
  resetOnUpdate: true
})
```

You can use the `resetOnUpdate` config to choose whether to totally remove an entity and add a new one with the new state,
or, and this is default, when set to false, you let akita handle how it updates its stores. Meaning, if you are updating the store by passing new state, the keys, that might have been removed in the new state, might still be present in the akita store. So if you want the new state to be the only source of truth, set this config to true.

`CollectionConfig` accepts a `Partial<CollectionOptions>` object as a parameter that looks like this:

```typescript
export interface CollectionOptions {
  path: string; // The path of the collection in Firestore
  idKey: string; // The key to use as an id for the document in Firestore. Default is store.idKey
}
```

## Path Getter

Sometimes the path is dynamic. If your service is targeting a subcollection, the path needs to know what the id is of the parent document.

In this case you'll need to override the `path` getter inside the class. Let's see how to do this with a `Stakeholder` of a specific movie:

```typescript
@Injectable({ providedIn: 'root' })
export class StakeholderService extends CollectionService<StakeholderState> {
  constructor(store: StakeholderStore, private movieQuery: MovieQuery) {
    super(store);
  }

  get path() {
    const movieId = this.movieQuery.getActiveId();
    return `movies/${movieId}/stakeholders`;
  }
}
```

1. We do not need the `CollectionConfig` here.
2. We inject `MovieQuery`, the query of the parent collection.
3. We override the `path` getter by getting the active movie id.
