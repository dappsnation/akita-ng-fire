import { Component, OnInit, OnDestroy } from '@angular/core';
import { OrganizationQuery } from '../+state/organization.query';
import { Organization } from '../+state/organization.model';
import { Observable, Subscription } from 'rxjs';
import { MovieService, MovieQuery, Movie } from 'src/app/collection/+state';
import { switchMap, filter } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { OrganizationService } from '../+state/organization.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'organization-view',
  templateUrl: './organization-view.component.html',
  styleUrls: ['./organization-view.component.css']
})
export class OrganizationViewComponent implements OnInit, OnDestroy {

  private sub: Subscription;
  public organizationList$: Observable<Organization[]>;
  public organization$: Observable<Organization>;
  public movies$: Observable<Movie[]>;
  public movieIdForm = new FormControl('');

  constructor(
    private movieService: MovieService,
    private movieQuery: MovieQuery,
    private service: OrganizationService,
    private query: OrganizationQuery,
    private router: Router,
    private routes: ActivatedRoute
  ) { }

  ngOnInit() {
    this.organizationList$ = this.query.selectAll();
    this.organization$ = this.query.selectActive();
    this.movies$ = this.movieQuery.selectAll();
    this.sub = this.query.selectActive().pipe(
      filter(org => !!org),
      switchMap(org => this.movieService.syncManyDocs(org.movieIds)),
    ).subscribe();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  changeOrg({ value }) {
    this.router.navigate(['..', value], { relativeTo: this.routes });
  }

  async addMovie(org: Organization) {
    const id = this.movieIdForm.value;
    const movieIds = [...org.movieIds, id];
    await this.service.update(org.id, { movieIds });
    this.movieIdForm.reset();
  }

  async removeMovie(org: Organization) {
    const id = this.movieIdForm.value;
    const movieIds = org.movieIds.filter(movieId => movieId !== id);
    await this.service.update(org.id, { movieIds });
    this.movieIdForm.reset();
  }
}
