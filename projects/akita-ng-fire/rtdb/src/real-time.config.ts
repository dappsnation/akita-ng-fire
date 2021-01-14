
export interface RealTimeOptions {
  /** The name of the node in the database */
  nodeName: string;
}

/** Set the configuration for the collection service */
export function RealTimeConfig(options: Partial<RealTimeOptions> = {}) {
  return (constructor) => {
    Object.keys(options).forEach(key => constructor[key] = options[key]);
  };
}
