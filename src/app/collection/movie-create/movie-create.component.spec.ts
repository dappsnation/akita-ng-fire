import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MovieCreateComponent } from './movie-create.component';

describe('MovieCreateComponent', () => {
  let component: MovieCreateComponent;
  let fixture: ComponentFixture<MovieCreateComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MovieCreateComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MovieCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
