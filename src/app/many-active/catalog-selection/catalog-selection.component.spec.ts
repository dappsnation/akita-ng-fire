import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CatalogSelectionComponent } from './catalog-selection.component';

describe('CatalogSelectionComponent', () => {
  let component: CatalogSelectionComponent;
  let fixture: ComponentFixture<CatalogSelectionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CatalogSelectionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CatalogSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
