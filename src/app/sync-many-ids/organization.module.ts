import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSelectModule } from '@angular/material/select';

import {
  OrganizationListGuard,
  ActiveOrganizationGuard,
} from './organization.guard';
import { OrganizationCreateComponent } from './organization-create/organization-create.component';
import { OrganizationListComponent } from './organization-list/organization-list.component';
import { OrganizationViewComponent } from './organization-view/organization-view.component';
import { AuthGuard } from '../auth/auth.guard';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatToolbarModule,
    MatSelectModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      {
        path: 'list',
        component: OrganizationListComponent,
        canActivate: [AuthGuard, OrganizationListGuard],
        canDeactivate: [AuthGuard, OrganizationListGuard],
      },
      { path: 'create', component: OrganizationCreateComponent },
      {
        path: 'view/:orgId',
        component: OrganizationViewComponent,
        canActivate: [ActiveOrganizationGuard],
        canDeactivate: [ActiveOrganizationGuard],
      },
    ]),
  ],
  declarations: [
    OrganizationCreateComponent,
    OrganizationListComponent,
    OrganizationViewComponent,
  ],
})
export class OrganizationModule {}
