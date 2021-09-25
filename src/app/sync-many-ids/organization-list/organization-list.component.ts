import { Component, OnInit } from '@angular/core';
import { OrganizationQuery } from '../+state/organization.query';
import { Organization } from '../+state/organization.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'organization-list',
  templateUrl: './organization-list.component.html',
  styleUrls: ['./organization-list.component.css'],
})
export class OrganizationListComponent implements OnInit {
  public organizations$: Observable<Organization[]>;

  constructor(private query: OrganizationQuery) {}

  ngOnInit() {
    this.organizations$ = this.query.selectAll();
  }
}
