import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StakeholderListComponent } from './stakeholder-list.component';

describe('StakeholderListComponent', () => {
  let component: StakeholderListComponent;
  let fixture: ComponentFixture<StakeholderListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StakeholderListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StakeholderListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
