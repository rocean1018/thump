import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const prompts = [
  ['808', 'Pure sine sub 808, clean, sustained, no punch, F1'],
  ['808', 'Short clipped punchy 808, hard attack, F1'],
  ['808', 'Reese 808, growling detuned bass, long, F1'],
  ['808', 'Drill 808, long downward slide, F1'],
  ['kick', 'Round deep soft kick'],
  ['kick', 'Clicky hard tight kick'],
  ['hihat', 'Closed hi hat, short crisp tick'],
  ['hihat', 'Open hi hat, long airy sizzle'],
  ['snare', 'Dry rimshot snare'],
  ['snare', 'Layered clap snare with a wide tail'],
  ['snare', 'Full body warm snare'],
  ['808', 'Spinz 808 in F1'],
  ['808', 'Zay 808 in F1'],
];

test('contrasting prompts produce distinct envelopes and spectra', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173');
  const results = await page.evaluate(async (pairs) => {
    const load = (p: string) => import(/* @vite-ignore */ p);
    const { interpretPrompt } = await load('/src/audio/promptParser.ts');
    const { generateVariations } = await load('/src/audio/variationEngine.ts');
    const { renderRecipe } = await load('/src/audio/synthesis/index.ts');
    const { audioBufferToWavBlob } = await load('/src/audio/export/wav.ts');
    const output = [];
    for (const [instrument, prompt] of pairs) {
      const recipe = generateVariations(instrument, interpretPrompt(prompt), null, 333)[0];
      const start = performance.now();
      const buffer = await renderRecipe(recipe);
      const renderMs = performance.now() - start;
      const data = buffer.getChannelData(0);
      let total = 0, peak = 0, sum = 0, crossings = 0;
      for (let i = 0; i < data.length; i++) {
        total += data[i] ** 2; peak = Math.max(peak, Math.abs(data[i])); sum += data[i];
        if (i && data[i] * data[i - 1] < 0) crossings++;
      }
      let accumulated = 0, energy95 = 0;
      for (let i = 0; i < data.length; i++) { accumulated += data[i] ** 2; if (accumulated >= total * .95) { energy95 = i / buffer.sampleRate; break; } }
      // Full positive spectrum, averaged over early/body/tail frames.
      let weighted = 0, magnitude = 0, highEnergy = 0, spectrumEnergy = 0;
      for (const fraction of [.03, .18, .4]) {
        const n = 2048, offset = Math.floor(data.length * fraction);
        for (let k = 1; k < n / 2; k++) {
          let re = 0, im = 0;
          for (let j = 0; j < n; j++) {
            const sample = (data[offset + j] ?? 0) * (.5 - .5 * Math.cos(2 * Math.PI * j / (n - 1)));
            const angle = 2 * Math.PI * k * j / n;
            re += sample * Math.cos(angle); im -= sample * Math.sin(angle);
          }
          const power = re * re + im * im, mag = Math.sqrt(power), hz = k * buffer.sampleRate / n;
          weighted += hz * mag; magnitude += mag; spectrumEnergy += power;
          if (hz > 180) highEnergy += power;
        }
      }
      output.push({ instrument, prompt, character: recipe.character ?? 'legacy', duration: buffer.duration,
        energy95, centroid: weighted / magnitude, harmonicRatio: highEnergy / spectrumEnergy,
        rms: Math.sqrt(total / data.length), peak, dc: sum / data.length, crossings,
        renderMs,
        wav: Array.from(new Uint8Array(await audioBufferToWavBlob(buffer).arrayBuffer())) });
    }
    return output;
  }, prompts);
  const metrics = results.map(({ wav, ...r }) => r);
  await writeFile(process.env.THUMP_BASELINE ? '/tmp/thump-audio-before.json' : '/tmp/thump-audio-after.json', JSON.stringify(metrics, null, 2));
  for (let i = 0; i < results.length; i++) {
    await writeFile(test.info().outputPath('sound-' + i + '.wav'), Buffer.from(results[i].wav));
    expect(results[i].peak).toBeLessThanOrEqual(.951);
    expect(results[i].peak).toBeGreaterThan(.3);
  }
  console.log(JSON.stringify(metrics));
  if (process.env.THUMP_BASELINE) return;
  expect(results[1].harmonicRatio).toBeGreaterThan(results[0].harmonicRatio * 3);
  expect(results[0].energy95).toBeGreaterThan(results[1].energy95 * 2);
  expect(results[2].harmonicRatio).toBeGreaterThan(results[0].harmonicRatio * 4);
  expect(results[5].centroid).toBeGreaterThan(results[4].centroid * 1.5);
  expect(results[7].energy95).toBeGreaterThan(results[6].energy95 * 3);
  expect(results[9].energy95).toBeGreaterThan(results[8].energy95 * 1.5);
  expect(results[11].character).toBe('808-punch');
  expect(results[12].character).toBe('808-zay');
  for (const i of [11,12]) {
    expect(results[i].energy95).toBeGreaterThan(.25);
    expect(results[i].rms).toBeGreaterThan(.25);
  }
  expect(Math.abs(results[11].centroid-results[12].centroid)).toBeGreaterThan(15);
});

test('all voice families stay usable and deterministic at refinement extremes', async ({page}) => {
  await page.goto('http://127.0.0.1:5173');
  const results = await page.evaluate(async () => {
    const load = (p:string) => import(/* @vite-ignore */ p);
    const {CHARACTERS,characterParams} = await load('/src/audio/characters.ts');
    const {voiceRecipe} = await load('/src/audio/synthesis/voices.ts');
    const {renderRecipe} = await load('/src/audio/synthesis/index.ts');
    const {interpretPrompt} = await load('/src/audio/promptParser.ts');
    const failures:string[] = [];
    for (const c of CHARACTERS) {
      for (const setting of ['default','short-dark','long-bright']) {
        const params = characterParams(c);
        if (setting !== 'default') Object.assign(params, {
          attack:setting==='short-dark'?1:0,
          decay:setting==='short-dark'?0:1,
          tone:setting==='short-dark'?0:1,
          distortion:setting==='short-dark'?0:1,
        });
        const recipe = {...voiceRecipe(c.instrument,117,c.pitchHz,params),character:c.id};
        const buffer = await renderRecipe(recipe), data=buffer.getChannelData(0);
        const peak=data.reduce((a:number,b:number)=>Math.max(a,Math.abs(b)),0);
        const rms=Math.sqrt(data.reduce((a:number,b:number)=>a+b*b,0)/data.length);
        if (!data.every((x:number)=>Number.isFinite(x)) || peak>.951 || peak<.3 || rms<.035 || data[0]!==0 || data[data.length-1]!==0) failures.push(c.id+':'+setting);
        if (setting==='default') {
          const again=(await renderRecipe(recipe)).getChannelData(0);
          if (again.length!==data.length || !data.every((x:number,i:number)=>Math.abs(x-again[i])<1e-5)) failures.push(c.id+':nondeterministic');
        }
      }
    }
    const short=interpretPrompt('short').deltas.decay;
    if (interpretPrompt('short tight quick').deltas.decay!==short) failures.push('synonym pile-up');
    if (interpretPrompt('clipped').deltas.decay!==undefined) failures.push('clipping shortened envelope');
    return failures;
  });
  expect(results).toEqual([]);
});
