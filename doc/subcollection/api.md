# Subcollection Service - Getting Started
The `SubcollectionService` is an extended version of the `CollectionService`. It's designed to answer common subcollection specific behavior.

**Important**: `SubcollectionService` relies on the `RouterService` from [Angular Router Store](https://netbasal.gitbook.io/akita/angular-plugins/angular-router-store).

```typescript
interface StakeholderState extends SubcollectionState<Stakeholder> {}

@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies/:movieId/stakeholders' })
export class StakeholderService extends SubcollectionService<StakeholderState> {

  constructor(
    db: AngularFirestore,
    store: StakeholderStore,
    routesQuery: RouterQuery
  ) {
    super(db, store, routesQuery);
  }

}
```

and in `main.ts`, [activate reset](https://netbasal.gitbook.io/akita/general/reset-stores).

## SubcollectionState
Your state needs to extends the `SubcollectionState`. It will old the current state of the path to detect any change in the params : 
```typescript
export interface SubcollectionState<E = any> extends CollectionState<E> {
  path: string;
}
```

## Path
`SubcollectionService` provides you an elegant way to describe your deeply nested subcollection with params.
```typescript
@CollectionConfig({ path: 'movies/:movieId/stakeholders' })
```

To analyse this path in your code, akita-ng-fire gives access to two helpers methods :

### getPathParams
It will retrieve the params names from your path : 
```typescript
getPathParams(path: string): string[]
```

### pathWithParams
It will generate the path by replacing parameters with the one provided as second argument :
```typescript
pathWithParams(path: string, params: HashMap<string>): string
```
> Keys of the `params` argument have to be the same as the param names in the path.

## SubcollectionService
The `SubcollectionService` uses the Routes params as source of parameters for the path to automate sync. It'll **reset** the store if one of the params have changed. Like that your store doesn't merge several subcollections data.
