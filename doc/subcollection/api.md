# DEPRECATED (>2.0.0)

**Subcollection Service have been removed from the library starting with version 2.0.0.**

Checkout the [cookbook](../cookbook/subcollection.md) for implementation of Subcollection with version 2.0.0.

This documentation only apply for version 1.0.0.


# Subcollection Service - Getting Started
The `SubcollectionService` is an extended version of the `CollectionService`. It's designed to answer common subcollection specific behaviors.

**Important**: `SubcollectionService` relies on the `RouterService` from [Angular Router Store](https://datorama.github.io/akita/docs/angular/router/).

```typescript
@Injectable({ providedIn: 'root' })
@CollectionConfig({ path: 'movies/:movieId/stakeholders' })
export class StakeholderService extends SubcollectionService<StakeholderState> {

  constructor(store: StakeholderStore) {
    super(store);
  }

}
```

and in `main.ts`, [activate reset](https://datorama.github.io/akita/docs/additional/reset).


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

