import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { MarketplaceCarouselComponent } from './marketplace-carousel.component';

describe('MarketplaceCarouselComponent', () => {
  let component: MarketplaceCarouselComponent;
  let fixture: ComponentFixture<MarketplaceCarouselComponent>;

  beforeEach(waitForAsync(() => {
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
