import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OrganizationCreateComponent } from './organization-create.component';

describe('OrganizationCreateComponent', () => {
  let component: OrganizationCreateComponent;
  let fixture: ComponentFixture<OrganizationCreateComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OrganizationCreateComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OrganizationCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
