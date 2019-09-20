import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { MatListModule } from '@angular/material/list';

import { MarketplaceHomeComponent } from './marketplace-home/marketplace-home.component';
import { MarketplaceCarouselComponent } from './marketplace-carousel/marketplace-carousel.component';

@NgModule({
  imports: [
    CommonModule,
    MatListModule,
    RouterModule.forChild([{ path: '', component: MarketplaceHomeComponent }])
  ],
  declarations: [MarketplaceHomeComponent, MarketplaceCarouselComponent]
})
export class MarketplaceModule {}
