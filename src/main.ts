/**
 * main.ts — Point d'entrée de l'application Angular OllMark Plugin.
 *
 * Ce fichier initialise l'application Angular en mode standalone via
 * `bootstrapApplication`. La configuration des providers racine (HttpClient,
 * Zone.js…) est centralisée dans {@link appConfig}.
 *
 * @module main
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
    .catch(console.error);