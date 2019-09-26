import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { StakeholderService, createStakeholder } from '../+state';
import { StakeholderForm } from '../stakeholder.form';

@Component({
  selector: 'stakeholder-create',
  templateUrl: './stakeholder-create.component.html',
  styleUrls: ['./stakeholder-create.component.css'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class StakeholderCreateComponent {
  public form = new StakeholderForm();

  constructor(
    private service: StakeholderService,
    private routes: ActivatedRoute,
    private router: Router
  ) { }

  async create() {
    const { movieId } = this.routes.snapshot.params;
    const stakeholder = createStakeholder(this.form.value);
    await this.service.add(stakeholder, { pathParams: { movieId }});
    this.router.navigate(['../list'], { relativeTo: this.routes });
  }
}
