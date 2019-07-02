import { Component, OnInit } from '@angular/core';
import { StakeholderQuery, Stakeholder } from '../+state';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-stakeholder-list',
  templateUrl: './stakeholder-list.component.html',
  styleUrls: ['./stakeholder-list.component.css']
})
export class StakeholderListComponent implements OnInit {
  public stakeholders$: Observable<Stakeholder[]>;
  public loading$: Observable<boolean>;

  constructor(
    private query: StakeholderQuery,
  ) {}

  ngOnInit() {
    this.stakeholders$ = this.query.selectAll();
    this.loading$ = this.query.selectLoading();
  }

}
