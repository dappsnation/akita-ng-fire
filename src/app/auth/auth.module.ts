import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SigninComponent } from './signin/signin.component';

import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [SigninComponent],
  exports: [SigninComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    RouterModule
  ]
})
export class AuthModule { }
