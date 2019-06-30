import { Component, OnInit } from '@angular/core';
import { StakeholderService } from '../+state';

@Component({
  selector: 'app-stakeholder-list',
  templateUrl: './stakeholder-list.component.html',
  styleUrls: ['./stakeholder-list.component.css']
})
export class StakeholderListComponent implements OnInit {

  constructor(private service: StakeholderService) { }

  ngOnInit() {
  }

  add() {
  }

}
