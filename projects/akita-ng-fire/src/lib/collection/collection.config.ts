
export interface CollectionOptions {
  /** The path of the collection in Firestore */
  path: string;
  /** The key to use as an id for the document in Firestore. Default is store.idKey */
  idKey?: string;
}

/** Set the configuration for the collection service */
export function CollectionConfig(options: Partial<CollectionOptions> = {}) {
  return (constructor) => {
    Object.keys(options).forEach(key => constructor[key] = options[key]);
  };
}
