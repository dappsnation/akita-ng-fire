# Change Log 

<a name="3.0.2"></a>

Added `resetOnUpdate` config to `CollectionService`. With this config you can choose whether you totally want to remove and entity and add a new one with the new state,
or, and this is default, when set to false, you let akita handle how they update their stores by design. Meaning if your new state updating the store, the keys that maybe got removed in the new state are still present in the akita store. So if you want the new state to be the only source of truth, set this config to true.