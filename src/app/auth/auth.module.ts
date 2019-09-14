import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SigninComponent } from './signin/signin.component';

import { MatButtonModule } from '@angular/material/button';

@NgModule({
  declarations: [SigninComponent],
  exports: [SigninComponent],
  imports: [
    CommonModule,
    MatButtonModule
  ]
})
export class AuthModule { }
