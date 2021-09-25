import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { MatListModule } from '@angular/material/list';

import { MarketplaceHomeComponent } from './marketplace-home/marketplace-home.component';
import { MarketplaceCarouselComponent } from './marketplace-carousel/marketplace-carousel.component';
import { MovieListGuard } from '../collection/movie.guard';

@NgModule({
  imports: [
    CommonModule,
    MatListModule,
    RouterModule.forChild([
      {
        path: '',
        component: MarketplaceHomeComponent,
        canActivate: [MovieListGuard],
        canDeactivate: [MovieListGuard],
      },
    ]),
  ],
  declarations: [MarketplaceHomeComponent, MarketplaceCarouselComponent],
})
export class MarketplaceModule {}
