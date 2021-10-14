import {
  apply,
  applyTemplates,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  Rule,
  SchematicsException,
  Tree,
  url
} from '@angular-devkit/schematics';
import {strings} from '@angular-devkit/core';
import {buildDefaultPath, Location, parseName, WorkspaceProject, WorkspaceSchema} from 'schematics-utilities';

import {Schema as Options} from './schema';

/** Get the path of the project */
function getProjectPath(tree: Tree, options: Options): Location {
  const workspaceBuffer = tree.read('angular.json');
  if (!workspaceBuffer) {
    throw new SchematicsException(
      'No angular CLI workspace (angular.json) found.'
    );
  }

  const workspace: WorkspaceSchema = JSON.parse(workspaceBuffer.toString());
  const projectName = options.project || workspace.defaultProject;
  if (!projectName) {
    throw new SchematicsException(
      'Project name not found. Please provide the name of the projet.'
    );
  }
  const project = workspace.projects[projectName] as WorkspaceProject;
  const path = buildDefaultPath(project);
  return parseName(path, options.name);
}

/**  Generate the CollectionService */
export default function _(options: Options): Rule {
  return (tree: Tree) => {
    const { name, path } = getProjectPath(tree, options);

    const templateSource = apply(url('./files'), [
      options.spec
        ? noop()
        : filter((filePath) => !filePath.endsWith('.spec.ts')),
      applyTemplates({ ...strings, ...options, name }),
      move(path)
    ]);
    return chain([
      mergeWith(templateSource)
    ]);
  };
}
