import { FormGroup, FormControl } from '@angular/forms';

export class MovieForm extends FormGroup {
  constructor() {
    super({
      title: new FormControl(),
      description: new FormControl(),
    });
  }
}
