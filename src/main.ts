import 'hammerjs';
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { akitaDevtools } from '@datorama/akita';

if (environment.production) {
  enableProdMode();
} else {
  akitaDevtools();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
