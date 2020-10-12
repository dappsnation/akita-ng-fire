import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VehicleComponent } from './vehicle-list/vehicle.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([{ path: '', component: VehicleComponent }])
  ],
  declarations: [VehicleComponent],
})
export class VehicleModule { }
