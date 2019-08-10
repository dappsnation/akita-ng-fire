import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Schema as WorkspaceOptions } from '@schematics/angular/workspace/schema';
import { Schema as ApplicationOptions, Style } from '@schematics/angular/application/schema';
import * as path from 'path';
import { Schema } from './schema';

const workspaceOptions: WorkspaceOptions = {
  name: 'workspace',
  newProjectRoot: 'projects',
  version: '8.0.0'
};

const appOptions: ApplicationOptions = {
  name: 'foo',
  inlineStyle: false,
  inlineTemplate: false,
  routing: false,
  style: Style.Css,
  skipTests: false,
  skipPackageJson: false
};

const collectionPath = path.join(__dirname, '../../collection.json');
const runner = new SchematicTestRunner('schematics', collectionPath);

let appTree: UnitTestTree;

// HELPERS
function createNgApp(tree: UnitTestTree, name: string) {
  const options = { ...appOptions, name };
  return runner
    .runExternalSchematicAsync('@schematics/angular', 'application', options, tree)
    .toPromise();
}

function createCollectionService(tree: UnitTestTree, options: Schema) {
  return runner.runSchematicAsync('collection-service', options, tree).toPromise();
}


describe('CollectionService', () => {

  beforeEach(async () => {
    appTree = await runner.runExternalSchematicAsync('@schematics/angular', 'workspace', workspaceOptions).toPromise();
    appTree = await createNgApp(appTree, 'foo');
  });

  it('Should create a CollectionService', async () => {
    const options: Schema = { name: 'movie' };
    const tree = await createCollectionService(appTree, options);
    expect(tree.files.includes('/projects/foo/src/app/movie.service.ts')).toBeTruthy();
  });

  it('Should create a CollectionService in another project', async () => {
    // creat another app
    appTree = await createNgApp(appTree, 'bar');
    // Add ServiceCollection
    const options: Schema = { name: 'movie', project: 'bar' };
    const tree = await createCollectionService(appTree, options);
    expect(tree.files.includes('/projects/bar/src/app/movie.service.ts')).toBeTruthy();
  });

  it('Should have NO test file by default', async () => {
    const options: Schema = { name: 'movie' };
    const tree = await createCollectionService(appTree, options);
    expect(tree.files.includes('/projects/foo/src/app/movie.service_spec.ts')).toBeFalsy();
  });

  it('Should have test file with option', async () => {
    const options: Schema = { name: 'movie', spec: true };
    const tree = await createCollectionService(appTree, options);
    expect(tree.files.includes('/projects/foo/src/app/movie.service.spec.ts')).toBeTruthy();
  });
});
