import '@angular/compiler';
import { beforeEach, expect, it, vi } from 'vitest';

const bootstrap = vi.hoisted(() => vi.fn());
vi.mock('@angular/platform-browser', async importOriginal => ({
  ...await importOriginal<typeof import('@angular/platform-browser')>(),
  bootstrapApplication: bootstrap
}));

beforeEach(() => {
  vi.resetModules();
  bootstrap.mockReset().mockResolvedValue({});
});

it('bootstraps the application with router and HTTP providers', async () => {
  await import('./main');
  expect(bootstrap).toHaveBeenCalledOnce();
  const config = bootstrap.mock.calls[0][1];
  expect(config.providers).toHaveLength(2);
});

it('reports bootstrap failure explicitly', async () => {
  const error = new Error('bootstrap failed');
  bootstrap.mockRejectedValue(error);
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  await import('./main');
  await Promise.resolve();
  expect(log).toHaveBeenCalledWith(error);
  log.mockRestore();
});
