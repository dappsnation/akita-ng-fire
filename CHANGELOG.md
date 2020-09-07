# Change Log 

### 3.0.5
Bug fix for `getValue`. Now the idKey is merged into the value object. Thanks to @randallmeeker for the bug report.

### 3.0.4

`callFunction` is now part of the public API. Thanks to @wSedlacek

### 3.0.3

Bug fix from @TimVanMourik . Entity stores didn't get properly updated.

### 3.0.2

Added `resetOnUpdate` config to `CollectionService`. With this config you can choose whether you totally want to remove and entity and add a new one with the new state,
or, and this is default, when set to false, you let akita handle how they update their stores by design. Meaning if your new state updating the store, the keys that maybe got removed in the new state are still present in the akita store. So if you want the new state to be the only source of truth, set this config to true.