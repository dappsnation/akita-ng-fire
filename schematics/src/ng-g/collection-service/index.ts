import {
  Rule,
  SchematicContext,
  Tree,
  url,
  apply,
  template,
  mergeWith,
  SchematicsException,
  move,
  noop,
  filter
} from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';
import { buildDefaultPath } from '@schematics/angular/utility/project';
import { Location, parseName } from '@schematics/angular/utility/parse-name';
import { WorkspaceSchema } from '@schematics/angular/utility/workspace-models';

import { Schema } from './schema';

/** Get the path of the project */
function getProjectPath(tree: Tree, options: Schema): Location {
  const workspaceBuffer = tree.read('angular.json');
  if (!workspaceBuffer) {
    throw new SchematicsException('No angular CLI workspace (angular.json) found.');
  }

  const workspace: WorkspaceSchema = JSON.parse(workspaceBuffer.toString());
  const projectName = options.project || workspace.defaultProject;
  if (!projectName) {
    throw new SchematicsException('Project name not found. Please provide the name of the projet.');
  }
  const project = workspace.projects[projectName];
  const path = buildDefaultPath(project);
  return parseName(path, options.name);
}

/**  Generate the CollectionService */
export default function(options: Schema): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const { name, path } = getProjectPath(tree, options);

    const templateSource = apply(url('./files'), [
      options.spec
        ? noop()
        : filter(filePath => !filePath.endsWith('.spec.ts')),
      template({ ...strings, ...options, name }),
      move(path)
    ]);
    return mergeWith(templateSource);
  };
}
