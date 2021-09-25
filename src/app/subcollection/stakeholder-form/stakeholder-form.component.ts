import {
  Component,
  EventEmitter,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ControlContainer } from '@angular/forms';

@Component({
  selector: '[formGroup] stakeholder-form, [formGroupName] stakeholder-form',
  templateUrl: './stakeholder-form.component.html',
  styleUrls: ['./stakeholder-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StakeholderFormComponent {
  @Output() create = new EventEmitter();

  constructor(private controlContainer: ControlContainer) {}

  get control() {
    return this.controlContainer.control;
  }
}
