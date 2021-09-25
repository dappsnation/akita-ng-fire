import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { OrganizationService } from '../+state/organization.service';

@Component({
  selector: 'organization-create',
  templateUrl: './organization-create.component.html',
  styleUrls: ['./organization-create.component.css'],
})
export class OrganizationCreateComponent {
  public formName = new FormControl('');

  constructor(private service: OrganizationService, private router: Router) {
    this.service.getValue().then(console.log);
    this.service.valueChanges().subscribe(console.log);
  }

  create() {
    const name = this.formName.value;
    this.service.add({ name, movieIds: [] });
    this.router.navigate(['/organization/list']);
  }
}
