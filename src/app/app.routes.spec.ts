import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { AppComponent } from './app.component';
import { routes } from './app.routes';

describe('Application routes', () => {
  it('keeps empty and unknown routes directed to login', () => {
    expect(routes.filter(route => route.redirectTo)).toEqual([
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: '**', redirectTo: 'login' }
    ]);
    expect(new AppComponent()).toBeInstanceOf(AppComponent);
  });

  it.each(['login', 'dashboard'])('loads %s lazily', async path => {
    const route = routes.find(candidate => candidate.path === path);
    expect(route?.loadComponent).toBeTypeOf('function');
    const loaded = await route?.loadComponent?.();
    expect(loaded).toBeTypeOf('function');
  });
});
