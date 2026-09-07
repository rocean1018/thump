import { test, expect } from '@playwright/test';

test('family feedback matches prompts and 3D renders smoothly, then pauses', async ({ page }) => {
  await page.addInitScript(() => {
    const stats = { draws: 0, triangles: 0, pointerListeners: 0 };
    (window as any).__gpu = stats;
    const listen = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (type === 'pointermove' && this instanceof Element && this.matches('.sculpture-canvas')) stats.pointerListeners++;
      return listen.call(this, type, listener, options);
    };
    const prototype = WebGL2RenderingContext.prototype;
    const draw = prototype.drawElements;
    prototype.drawElements = function (mode, count, type, offset) {
      if (this.canvas instanceof HTMLCanvasElement && this.canvas.closest('.sculpture-canvas')) {
        stats.draws++; if (mode === this.TRIANGLES) stats.triangles += count / 3;
      }
      return draw.call(this, mode, count, type, offset);
    };
  });
  await page.goto('http://127.0.0.1:5173');
  await expect(page.locator('.sculpture-canvas canvas')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__gpu.pointerListeners)).toBe(0);
  await page.locator('#sound-prompt').fill('Pure sine sub, clean, long, F1');
  await expect(page.locator('.prompt-interpretation strong')).toHaveText('Pure sub');
  await page.locator('#sound-prompt').fill('Reese 808, detuned growling');
  await expect(page.locator('.prompt-interpretation strong')).toHaveText('Reese bass');
  await page.locator('#sound-prompt').fill('sparkling unicorn spaceship');
  await expect(page.locator('.prompt-interpretation')).toContainText('No sound details matched');
  const before = await page.locator('.sculpture-canvas').screenshot();
  const timing = await page.evaluate(async () => {
    const stats = (window as any).__gpu; stats.draws = 0; stats.triangles = 0;
    let last = performance.now();
    const intervals: number[] = [];
    await new Promise<void>(resolve => {
      const frame = (now: number) => {
        intervals.push(now-last); last=now;
        if (intervals.length < 90) requestAnimationFrame(frame); else resolve();
      }; requestAnimationFrame(frame);
    });
    intervals.sort((a,b)=>a-b);
    return { medianMs:intervals[45], p95Ms:intervals[85], draws:stats.draws, trianglesPerFrame:stats.triangles/90 };
  });
  console.log('3D profile', timing);
  expect(timing.draws).toBeGreaterThan(100);
  expect(timing.trianglesPerFrame).toBeLessThan(15000);
  const after = await page.locator('.sculpture-canvas').screenshot();
  expect(before.equals(after)).toBe(false);
  await page.getByRole('button',{name:'Animate 3D scene'}).click();
  const drawCount = await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    (window as any).__gpu.draws=0;
    await new Promise(r=>setTimeout(r,150));
    return (window as any).__gpu.draws;
  });
  expect(drawCount).toBe(0);
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.getByRole('button',{name:'Animate 3D scene'}).click();
  const reducedDraws = await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    (window as any).__gpu.draws = 0;
    await new Promise(r => setTimeout(r,150));
    return (window as any).__gpu.draws;
  });
  expect(reducedDraws).toBe(0);
  await page.screenshot({path:'test-results/thump-motion.png',fullPage:true});
});

test('reference and refinement retain the selected sound family', async ({page}) => {
  await page.goto('http://127.0.0.1:5173');
  const checks = await page.evaluate(async () => {
    const load=(p:string)=>import(/* @vite-ignore */ p);
    const {interpretPrompt}=await load('/src/audio/promptParser.ts');
    const {generateVariations,refineRecipe}=await load('/src/audio/variationEngine.ts');
    const {chooseCharacter,decayTime}=await load('/src/audio/characters.ts');
    const r=generateVariations('snare',interpretPrompt('layered clap'),null,912)[0];
    const refined=refineRecipe(r,{...r.params,decay:.8});
    const guided=generateVariations('snare',interpretPrompt('layered clap'),{
      fileName:'reference.wav',durationSec:.4,fundamentalHz:200,
      spectralCentroidHz:4500,attackSec:.002,decaySec:.12,peakLevel:.8,
    },912)[0];
    const timed=generateVariations('808',interpretPrompt('pure sub 500ms F1'),null,10)[0];
    return {
      preserved:r.character===refined.character,
      clap:r.character==='snare-clap',
      reference:guided.character===r.character && guided.params.decay!==r.params.decay,
      negated:chooseCharacter('snare','not a clap, dry rimshot').character.id==='snare-rim',
      duration:Math.abs(decayTime('808',timed.params.decay)-.5)<.00001,
      note:Math.abs(timed.basePitchHz-43.6535)<.01,
    };
  });
  expect(Object.values(checks).every(Boolean)).toBe(true);
});
