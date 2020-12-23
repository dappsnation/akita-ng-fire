
export interface CollectionOptions {
  /** The path of the collection in Firestore */
  path: string;
  /** The key to use as an id for the document in Firestore. Default is store.idKey */
  idKey?: string;
  /** 
   * If true we will remove the entity from the store 
   * and add a new one in other to make sure
   * to get the rid of the any old keys that maybe still persist.
   */
  resetOnUpdate: boolean;

  /**
   * If true we will merge the document ref that is stored in the doc into the currently active
   * akita store. If you want to handle that case for yourself you can use the hook formatFromFirestore
   */
  mergeReference: boolean;
}

/** Set the configuration for the collection service */
export function CollectionConfig(options: Partial<CollectionOptions> = {}) {
  return (constructor) => {
    Object.keys(options).forEach(key => constructor[key] = options[key]);
  };
}
