/**
 * Same as Object.getOwnPropertyDescriptor, but recursively checks prototype chain excluding passed currentClass
 * @param instance Instance to check on
 * @param params Property name to check
 * @param currentClass Checks prototype chain until this class
 * @example getPropertyDescriptor(this, 'path', CollectionService)
 */
export function getPropertyDescriptor(instance: any, property: string, currentClass: any = Object): PropertyDescriptor {
  const prototype = Object.getPrototypeOf(instance);
  if (!prototype || !(prototype instanceof currentClass)) return;
  return Object.getOwnPropertyDescriptor(prototype, property) || getPropertyDescriptor(prototype, property, currentClass);
}

/**
 * Check prototype chain for a specific getter function, excluding parent class
 * @param instance Instance of the class to check on
 * @param parentClass Parent class of the instance
 * @param property Property name to check
 * @example hasChildGetter(this, CollectionService, 'path')
 */
export function hasChildGetter(instance: any, parentClass: any, property: string): boolean {
  const descriptor = getPropertyDescriptor(instance, property, parentClass);
  return descriptor && descriptor.get && true;
}
