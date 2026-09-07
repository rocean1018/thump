import { test, expect } from '@playwright/test';
test('desktop studio: four engines, editable variations, WAV and MP3', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByRole('heading', { name: 'Find your own frequency.' })).toBeVisible();
  await expect(page.locator('.sculpture-canvas canvas')).toBeVisible();
  await page.screenshot({ path: 'test-results/thump-studio.png', fullPage: true });
  for (const instrument of ['808', 'Kick', 'Hi-Hat', 'Snare']) {
    await page.getByRole('button', { name: instrument, exact: true }).click();
    await page.locator('#sound-prompt').fill('tight and clean, no distortion');
    await page.getByRole('button', { name: /Generate sounds|Generate again/ }).click();
    await expect(page.getByRole('button', { name: 'Play variation 3' })).toBeEnabled();
    await page.locator('.select-button').first().click();
    await page.getByRole('button', { name: 'Play sound', exact: true }).click();
    await expect(page.getByText('SOUND IN MOTION')).toBeVisible();
    await page.locator('#slider-decay').fill('0.8');
    await expect(page.getByRole('button', { name: 'Download WAV', exact: true })).toBeEnabled();
    const wavEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download WAV', exact: true }).click();
    const wav = await wavEvent;
    expect(wav.suggestedFilename()).toContain(instrument === 'Hi-Hat' ? 'hihat' : instrument.toLowerCase());
    expect(await wav.failure()).toBeNull();
  }
  const mp3Event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download MP3', exact: true }).click();
  const mp3 = await mp3Event;
  expect(mp3.suggestedFilename()).toMatch(/\.mp3$/);
  expect(await mp3.failure()).toBeNull();
  await page.screenshot({ path: 'test-results/thump-refined.png', fullPage: true });
  await page.setViewportSize({ width: 1024, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});

test('DSP invariants: prompt intent, determinism, silence boundaries, 24-bit WAV', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173');
  const result = await page.evaluate(async () => {
    const load = (path: string) => import(/* @vite-ignore */ path);
    const { interpretPrompt } = await load('/src/audio/promptParser.ts');
    const { generateVariations, refineRecipe } = await load('/src/audio/variationEngine.ts');
    const { renderRecipe } = await load('/src/audio/synthesis/index.ts');
    const { audioBufferToWavBlob } = await load('/src/audio/export/wav.ts');
    const { analyzeReference } = await load('/src/audio/referenceAnalysis.ts');
    const assertions: Record<string, boolean> = {
      less: interpretPrompt('less distorted').deltas.distortion < 0,
      noTail: interpretPrompt('no tail').deltas.decay < 0,
      clean: interpretPrompt('no distortion').deltas.distortion < 0,
      note: Math.abs(interpretPrompt('sub in F1').absolutePitchHz - 43.6535) < .01,
    };
    for (const instrument of ['808', 'kick', 'hihat', 'snare']) {
      const recipes = generateVariations(instrument, interpretPrompt('clean, no distortion'), null, 123);
      assertions[instrument + 'Clean'] = recipes.every((r: any) => r.params.distortion === 0 && r.params.grit === 0);
      const a = await renderRecipe(recipes[0]), b = await renderRecipe(recipes[0]);
      const data = a.getChannelData(0);
      assertions[instrument + 'Finite'] = data.every((v: number) => Number.isFinite(v) && Math.abs(v) <= .951);
      assertions[instrument + 'Boundary'] = data[0] === 0 && data[data.length - 1] === 0;
      // Browser audio graphs can sum parallel oscillators in a different order.
      assertions[instrument + 'Deterministic'] = a.length === b.length && data.every((v: number, i: number) => Math.abs(v - b.getChannelData(0)[i]) < 0.00001);
      const refined = refineRecipe(recipes[0], { ...recipes[0].params, decay: .9 });
      assertions[instrument + 'Identity'] = refined.seed === recipes[0].seed && refined.basePitchHz === recipes[0].basePitchHz;
      const wav = new DataView(await audioBufferToWavBlob(a).arrayBuffer());
      assertions[instrument + 'Wav'] = wav.getUint16(34, true) === 24 && wav.getUint32(40, true) === a.length * 3;
    }
    const silent = new AudioBuffer({ length: 4410, sampleRate: 44100 });
    try { analyzeReference(silent, 'silent.wav'); assertions.silentRejected = false; } catch { assertions.silentRejected = true; }
    return assertions;
  });
  expect(Object.entries(result).filter(([, pass]) => !pass)).toEqual([]);
});
