import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { StakeholderForm } from '../stakeholder.form';
import { Stakeholder } from '../+state';

@Component({
  selector: 'stakeholder-form',
  templateUrl: './stakeholder-form.component.html',
  styleUrls: ['./stakeholder-form.component.css']
})
export class StakeholderFormComponent implements OnInit {

  @Output() create = new EventEmitter<Stakeholder>();
  public form: StakeholderForm;

  constructor() {}

  ngOnInit() {
    this.form = new StakeholderForm();
  }

}
