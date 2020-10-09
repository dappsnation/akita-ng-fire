import { Component, OnInit } from '@angular/core';
import { VehicleService } from '../+state/vehicle.service';

@Component({
  selector: 'vehicle-list',
  templateUrl: 'vehicle.component.html',
  styleUrls: ['./vehicle.component.scss']
})
export class VehicleComponent implements OnInit {
  constructor(private service: VehicleService) { }

  ngOnInit() {
    this.service.syncNode('vehicle');
    this.service.add({tesla: 'elon musk'})
   }
}