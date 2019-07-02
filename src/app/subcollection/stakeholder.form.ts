import { FormGroup, FormControl } from '@angular/forms';

export class StakeholderForm extends FormGroup {
  constructor() {
    super({
      name: new FormControl(),
    });
  }
}
