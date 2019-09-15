import { DocOptions } from './types';

// Helper to retrieve the id and path of a document in the collection
export function getIdAndPath(options: DocOptions, collectionPath?: string): { id: string, path: string } {
  let path = '';
  let id = '';
  if (options['id']) {
    if (!collectionPath) {
      throw new Error('You should provide the colletion path with the id');
    }
    id = options['id'];
    path = `${collectionPath}/${id}`;
  } else if (options['path']) {
    path = options['path'];
    const part = path.split('/');
    if (path.length % 2 !== 0) {
      throw new Error(`Path ${path} doesn't look like a Firestore's document path`);
    }
    id = part[part.length - 1];
  } else {
    throw new Error(`You should provide either an "id" OR a "path".`);
  }
  return { id, path };
}
