import { Component, OnInit, OnDestroy } from '@angular/core';
import { CompanyService, CompanyQuery } from '../+state';
import { Observable, Subscription } from 'rxjs';
import { Stakeholder } from 'src/app/subcollection/+state';

@Component({
  selector: 'company-list',
  templateUrl: './company-list.component.html',
  styleUrls: ['./company-list.component.css'],
})
export class CompanyListComponent implements OnInit, OnDestroy {
  private sub: Subscription;
  companies$: Observable<Stakeholder[]>;

  constructor(private service: CompanyService, private query: CompanyQuery) {}

  ngOnInit() {
    this.sub = this.service.syncCollection().subscribe();
    this.companies$ = this.query.selectAll();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
