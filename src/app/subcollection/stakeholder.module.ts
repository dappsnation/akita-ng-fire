import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StakeholderGuard } from './stakeholder.guard';

import { StakeholderListComponent } from './stakeholder-list/stakeholder-list.component';
import { StakeholderCreateComponent } from './stakeholder-create/stakeholder-create.component';

@NgModule({
  declarations: [StakeholderListComponent, StakeholderCreateComponent],
  imports: [
    CommonModule,
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
