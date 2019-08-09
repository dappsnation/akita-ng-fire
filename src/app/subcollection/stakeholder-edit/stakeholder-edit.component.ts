import { Component, OnInit, OnDestroy } from '@angular/core';
import { StakeholderQuery, StakeholderService, Stakeholder } from '../+state';
import { Observable, Subscription } from 'rxjs';
import { filter, startWith } from 'rxjs/operators';
import { StakeholderForm } from '../stakeholder.form';

@Component({
  selector: 'stakeholder-edit',
  templateUrl: './stakeholder-edit.component.html',
  styleUrls: ['./stakeholder-edit.component.css']
})
export class StakeholderEditComponent implements OnInit, OnDestroy {

  private subscription: Subscription;
  public stakeholder$: Observable<Stakeholder>;
  public form = new StakeholderForm();

  constructor(
    private service: StakeholderService,
    private query: StakeholderQuery
  ) { }

  ngOnInit() {
    this.stakeholder$ = this.form.valueChanges.pipe(startWith(this.form.value));
    this.subscription = this.query.selectActive().pipe(
      filter(value => !!value),
    ).subscribe(stakeholder => this.form.patchValue(stakeholder));
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  update() {
    const id = this.query.getActiveId();
    const update = this.form.value;
    this.service.update(id, update);
  }

}
