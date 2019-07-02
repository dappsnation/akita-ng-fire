import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StakeholderFormComponent } from './stakeholder-form.component';

describe('StakeholderFormComponent', () => {
  let component: StakeholderFormComponent;
  let fixture: ComponentFixture<StakeholderFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StakeholderFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StakeholderFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
