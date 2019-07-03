# Subcollection Service - Getting Started
The `SubcollectionService` is an extended version of the `CollectionService`. It's designed to answer common subcollection specific behaviors.

**Important**: `SubcollectionService` relies on the `RouterService` from [Angular Router Store](https://netbasal.gitbook.io/akita/angular-plugins/angular-router-store).

```typescript
@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies/:movieId/stakeholders' })
export class StakeholderService extends SubcollectionService<StakeholderState> {

  constructor(
    db: AngularFirestore,
    store: StakeholderStore,
    routerQuery: RouterQuery
  ) {
    super(db, store, routerQuery);
  }

}
```

and in `main.ts`, [activate reset](https://netbasal.gitbook.io/akita/general/reset-stores).


## Path
`SubcollectionService` provides you an elegant way to describe your deeply nested subcollection with params.
```typescript
@CollectionConfig({ path: 'movies/:movieId/stakeholders' })
```

## SubcollectionService
The `SubcollectionService` uses the Routes params as source of parameters for the path to automate sync. It'll **reset** the store if one of the params have changed. Like that your store doesn't merge several subcollections data.


## Utils
To analyse this path in your code, `akita-ng-fire` gives access to two helpers methods :

### getPathParams
It will retrieve the params names from your path : 
```typescript
function getPathParams(path: string): string[]
```
Example : 
`getPathParams('movies/:movieId/stakeholders') // 'movieId'`

### pathWithParams
It will generate the path by replacing parameters with the one provided as second argument :
```typescript
function pathWithParams(path: string, params: HashMap<string>): string
```

Example : 
`pathWithParams('movies/:movieId/stakeholders', {movieId: 123}) //'movies/123/stakeholders'`

