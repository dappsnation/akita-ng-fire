import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { StakeholderService, Stakeholder } from '../+state';

@Component({
  selector: 'stakeholder-create',
  templateUrl: './stakeholder-create.component.html',
  styleUrls: ['./stakeholder-create.component.css']
})
export class StakeholderCreateComponent {

  constructor(
    private service: StakeholderService,
    private routes: ActivatedRoute,
    private router: Router
  ) { }

  async create(stakeholder: Stakeholder) {
    await this.service.add(stakeholder);
    this.router.navigate(['../list'], { relativeTo: this.routes });
  }
}
