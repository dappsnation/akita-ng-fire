import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Component
import { CatalogListComponent } from './catalog-list/catalog-list.component';
import { CatalogSelectionComponent } from './catalog-selection/catalog-selection.component';

// Material
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  declarations: [CatalogListComponent, CatalogSelectionComponent],
  imports: [
    CommonModule,
    MatListModule,
    MatCardModule,
    MatButtonModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: CatalogListComponent },
      { path: 'selection', component: CatalogSelectionComponent },
    ]),
  ]
})
export class CatalogModule { }
