/* global test describe it expect afterAll */

const MaudeProcess = require('./maude');


test('MAUDE_PATH environment variable has been set to the path to Maude executable', () => {
  expect(process.env.MAUDE_PATH).not.toBeUndefined();
});

describe('The Maude Process', () => {
  const maude = new MaudeProcess(process.env.MAUDE_PATH);

  it('should be in the version 2.7.1', () => {
    expect(maude.version).toBe('2.7.1');
  });

  it('should throw Maude errors properly', async () => {
    expect.assertions(1);
    try {
      await maude.run('help');
    } catch (error) {
      expect(error.toString()).toMatch(/MaudeError: Warning: .+, line \d+: skipped unexpected token: help/);
    }
  });

  afterAll(() => {
    maude.destroy();
  });
});
