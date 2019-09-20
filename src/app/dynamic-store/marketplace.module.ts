import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MarketplaceHomeComponent } from './marketplace-home/marketplace-home.component';
import { MarketplaceCarouselComponent } from './marketplace-carousel/marketplace-carousel.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([{ path: '', component: MarketplaceHomeComponent }])
  ],
  declarations: [MarketplaceHomeComponent, MarketplaceCarouselComponent]
})
export class MarketplaceModule {}
