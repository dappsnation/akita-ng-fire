import { NgModule } from '@angular/core';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';

const material = [
  MatToolbarModule,
  MatCardModule,
  MatButtonModule,
  MatSnackBarModule,
  MatInputModule,
  MatFormFieldModule,
  MatTabsModule,
];

@NgModule({
  imports: material,
  exports: material
})
export class MaterialModule {}
