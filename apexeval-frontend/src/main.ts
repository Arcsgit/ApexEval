import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

console.log('Starting ApexEval bootstrap...');

bootstrapApplication(AppComponent, appConfig)
  .then((ref) => {
    console.log('ApexEval bootstrap successful!');
    console.log('ApplicationRef:', ref);
  })
  .catch((err) => {
    console.error('ApexEval bootstrap failed:', err);
    console.error('Stack:', err?.stack);
  });
