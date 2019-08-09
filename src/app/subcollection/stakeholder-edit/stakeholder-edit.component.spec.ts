import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StakeholderEditComponent } from './stakeholder-edit.component';

describe('StakeholderEditComponent', () => {
  let component: StakeholderEditComponent;
  let fixture: ComponentFixture<StakeholderEditComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StakeholderEditComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StakeholderEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
