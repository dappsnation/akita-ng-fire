import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OrganizationCreateComponent } from './organization-create/organization-create.component';
import { OrganizationListComponent } from './organization-list/organization-list.component';

import { MatListModule } from '@angular/material/list';
import { OrganizationListGuard } from './organization.guard';

@NgModule({
  imports: [
    CommonModule,
    MatListModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      {
        path: 'list',
        component: OrganizationListComponent,
        canActivate: [OrganizationListGuard],
        canDeactivate: [OrganizationListGuard],
      }
    ])
  ],
  declarations: [OrganizationCreateComponent, OrganizationListComponent]
})
export class OrganizationModule {}
