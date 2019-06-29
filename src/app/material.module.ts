import { NgModule } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

const material = [
  MatCardModule,
  MatButtonModule,
  MatSnackBarModule,
  MatInputModule,
  MatFormFieldModule,
];

@NgModule({
  imports: material,
  exports: material
})
export class MaterialModule {}
