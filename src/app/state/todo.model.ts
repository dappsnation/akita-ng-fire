export interface Todo {
  id: string;
  checked: boolean;
  label: string;
}

/**
 * A factory function that creates Todos
 */
export function createTodo(params: Partial<Todo>) {
  return {
    ...params
  } as Todo;
}
