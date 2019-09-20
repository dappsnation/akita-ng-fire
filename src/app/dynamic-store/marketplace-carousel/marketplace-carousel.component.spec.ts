import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MarketplaceCarouselComponent } from './marketplace-carousel.component';

describe('MarketplaceCarouselComponent', () => {
  let component: MarketplaceCarouselComponent;
  let fixture: ComponentFixture<MarketplaceCarouselComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MarketplaceCarouselComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MarketplaceCarouselComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
