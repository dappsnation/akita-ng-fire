import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { VehicleComponent } from './vehicle.component';

@NgModule({
    imports: [CommonModule,
        RouterModule.forChild([{ path: '', component: VehicleComponent }]),
    ReactiveFormsModule],
    declarations: [VehicleComponent],
})
export class VehicleModule { }
