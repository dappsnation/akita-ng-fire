# Collection Group Service - Getting Started

The `CollectionGroupService` is a simple service to sync a store with a collection group.

```typescript
@Injectable({ providedIn: 'root' })
export class MovieService extends CollectionGroupService<MovieState> {
  collectionId = 'movies';

  constructor(store: MovieStore) {
    super(store);
  }
}
```

> This service provides **readonly** methods only as CollectionGroup cannot be updated. For more interactive operation use `CollectionService`.

## Properties

```typescript
collectionId: string;
```

The id of the collection group you want to sync with. This value is **mandatory**.

## Methods

```typescript
syncCollection(query?: QueryGroupFn);
```

Sync the collection group query with the store.

```typescript
getValue(query?: QueryGroupFn): Promise<E[]>
```

Get a snapshot of the collection group query.
