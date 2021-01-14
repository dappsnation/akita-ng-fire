# Change Log

## 4.30
Created a second entry point for the `real time database service` => `akita-ng-fire/rtdb`

## 4.0.1
Thanks to @randallmeeker for reporting a bug on how we reset the store.

## 4.0.0
Update peerDependencies firebase to version >= 8 and @angular/fire to version >= 6.0.4, firebase 8 now uses EMS instead of CommonJs.
Thanks to @avelow 

### 3.1.6
Removed export from public api

### 3.1.5
Removed if statement in `upsert` method. It was causing an issue when we provide an object with the id of the document.
`service.upsert({ id, ...updates })`

### 3.1.4
Fixed wrong hook call in auth service.

### 3.1.3
Fixed scope issue in signin function.

### 3.1.2
If signin is working with a not new user, we update the store from the corresponding document from firestore.

### 3.1.1
Fixed issue with profile object getting updated in the signin method from the auth service.

### 3.1.0
The auth store gets now updated properly when a user signs in after he signed up. 
Also the function `fireAuth` that was deprecated for a long time has been removed.

### 3.0.5
Bug fix for `getValue`. Now the idKey is merged into the value object. Thanks to @randallmeeker for the bug report.

### 3.0.4
`callFunction` is now part of the public API. Thanks to @wSedlacek

### 3.0.3
Bug fix from @TimVanMourik . Entity stores didn't get properly updated.

### 3.0.2
Added `resetOnUpdate` config to `CollectionService`. With this config you can choose whether you totally want to remove and entity and add a new one with the new state,
or, and this is default, when set to false, you let akita handle how they update their stores by design. Meaning if your new state updating the store, the keys that maybe got removed in the new state are still present in the akita store. So if you want the new state to be the only source of truth, set this config to true.
