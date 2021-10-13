import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { VehicleService } from './+state/vehicle.service';
import { VehicleQuery } from './+state/vehicle.query';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-vehicle-list',
  templateUrl: 'vehicle.component.html',
})
export class VehicleComponent implements OnInit, OnDestroy {
  vehicles$ = this.query.selectAll();

  form = new FormGroup({
    name: new FormControl(),
    tires: new FormControl(),
  });

  sub: Subscription;

  constructor(private service: VehicleService, private query: VehicleQuery) {}

  ngOnInit() {
    this.sub = this.service.syncNodeWithStore().subscribe();
    this.vehicles$.subscribe(console.log);
  }

  addVehicle() {
    this.service.add(this.form.value);
  }

  removeVehicle(id: string) {
    this.service.remove(id);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
