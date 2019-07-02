import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { StakeholderGuard } from './stakeholder.guard';
import { MaterialModule } from '../material.module';

import { StakeholderListComponent } from './stakeholder-list/stakeholder-list.component';
import { StakeholderCreateComponent } from './stakeholder-create/stakeholder-create.component';
import { StakeholderFormComponent } from './stakeholder-form/stakeholder-form.component';

@NgModule({
  declarations: [StakeholderListComponent, StakeholderCreateComponent, StakeholderFormComponent],
  imports: [
    CommonModule,
    MaterialModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'create', component: StakeholderCreateComponent },
      {
        path: 'list',
        component: StakeholderListComponent,
        canActivate: [StakeholderGuard],
        canDeactivate: [StakeholderGuard]
      }
    ])
  ]
})
export class StakeholderModule { }
