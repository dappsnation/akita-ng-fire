import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CompanyListComponent } from './company-list/company-list.component';
import { MatListModule } from '@angular/material/list';

@NgModule({
  declarations: [CompanyListComponent],
  imports: [
    CommonModule,
    MatListModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: CompanyListComponent },
    ]),
  ],
})
export class CompanyModule {}
