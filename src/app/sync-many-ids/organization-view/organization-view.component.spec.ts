import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OrganizationViewComponent } from './organization-view.component';

describe('OrganizationViewComponent', () => {
  let component: OrganizationViewComponent;
  let fixture: ComponentFixture<OrganizationViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OrganizationViewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OrganizationViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
