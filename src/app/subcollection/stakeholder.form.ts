import { FormGroup, FormControl } from '@angular/forms';
import { Stakeholder } from './+state';

export class StakeholderForm extends FormGroup {
  constructor() {
    super({
      name: new FormControl(),
    });
  }

  value: Partial<Stakeholder>;
}
