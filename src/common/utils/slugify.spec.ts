import { slugify } from './slugify';

describe('slugify', () => {
  it('normalizes accents, spaces and symbols', () => {
    expect(slugify('Fone Bluetooth Pulse!!')).toBe('fone-bluetooth-pulse');
    expect(slugify('Casa & Cozinha')).toBe('casa-cozinha');
    expect(slugify('Eletr\u00f4nicos')).toBe('eletronicos');
  });
});
