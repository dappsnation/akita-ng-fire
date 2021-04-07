import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { StakeholderCreateComponent } from './stakeholder-create.component';

describe('StakeholderCreateComponent', () => {
  let component: StakeholderCreateComponent;
  let fixture: ComponentFixture<StakeholderCreateComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ StakeholderCreateComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StakeholderCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
