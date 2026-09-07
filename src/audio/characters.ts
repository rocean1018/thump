import { DEFAULT_CREATIVE_PARAMS, type CreativeParams, type Instrument } from '../types';

export interface Character {
  id: string; label: string; instrument: Instrument; terms: string[];
  params: Partial<CreativeParams>; pitchHz: number;
  wave?: OscillatorType; harmonics?: number; detune?: number;
  sweep?: number; slide?: number; body?: number; noise?: number;
  click?: number; clap?: boolean; rim?: boolean; hardClip?: boolean;
  /** Original band-limited harmonic recipes; amplitudes start at the fundamental. */
  partials?: number[]; weight?: number;
}
// Original synthesis families, not reproductions of commercial samples.
export const CHARACTERS: Character[] = [
  { id: '808-sub', label: 'Pure sub', instrument: '808', terms: ['pure sine','sine','sub','clean','smooth','soft','sustained','sustain','cloud','pluggnb'], params: { attack:.95, decay:.65, punch:.12, distortion:0, grit:0, tone:.2 }, pitchHz:43.65, wave:'sine', harmonics:0, sweep:1.08, click:0 },
  { id: '808-punch', label: 'Spinz-inspired punch', instrument: '808', terms: ['spinz','short','punchy','punch','bouncy','atlanta','tight'], params:{attack:1,decay:.53,punch:.8,distortion:.28,grit:0,tone:.46},pitchHz:49, partials:[1,.025,.14,.012,.045,.006,.018],weight:.63,sweep:2.9,click:.025,hardClip:true },
  { id: '808-zay', label: 'Zay-inspired growl', instrument: '808', terms:['zay','zaytoven'],params:{attack:.99,decay:.62,punch:.58,distortion:.3,grit:0,tone:.48},pitchHz:46.25,partials:[1,.24,.33,.07,.14,.035,.065,.018,.03],weight:.48,sweep:1.75,click:.012 },
  { id: '808-drive', label: 'Driven 808', instrument: '808', terms:['clipped','distorted','rage','opium','fuzzy','crunchy','aggressive','dirty'],params:{attack:1,decay:.57,punch:.7,distortion:.58,grit:0,tone:.55},pitchHz:46.25,partials:[1,.1,.3,.06,.16,.03,.08],weight:.6,sweep:2.6,click:.02,hardClip:true },
  { id:'808-slide',label:'Slide 808',instrument:'808',terms:['drill','slide','sliding','glide','gliding','downward'],params:{attack:.95,decay:.7,punch:.45,distortion:.38,grit:0,tone:.5},pitchHz:43.65,wave:'triangle',harmonics:.2,sweep:1.8,slide:12,click:.04 },
  { id:'808-reese',label:'Reese bass',instrument:'808',terms:['reese','detuned','growling','growl','buzzing'],params:{attack:.9,decay:.6,punch:.25,distortion:.35,grit:0,tone:.55},pitchHz:43.65,wave:'sawtooth',harmonics:.6,detune:11,sweep:1.1,click:0 },
  { id:'kick-round',label:'Round kick',instrument:'kick',terms:['round','deep','soft','warm','boomy','sub','analog'],params:{attack:.9,decay:.52,punch:.35,tone:.18,distortion:.06,grit:0},pitchHz:53,body:1,noise:.05,click:.06,sweep:3 },
  { id:'kick-click',label:'Click kick',instrument:'kick',terms:['click','clicky','beater','tight','punchy','drill','trap'],params:{attack:1,decay:.48,punch:.8,tone:.62,distortion:.18,grit:0},pitchHz:58,body:1,noise:.2,click:.2,sweep:4.2 },
  { id:'kick-crunch',label:'Clipped kick',instrument:'kick',terms:['hard','clipped','crunchy','distorted','rage','dirty','aggressive'],params:{attack:1,decay:.5,punch:.9,tone:.5,distortion:.48,grit:.04},pitchHz:55,body:1,noise:.25,click:.16,sweep:4,hardClip:true },
  { id:'hat-closed',label:'Closed hat',instrument:'hihat',terms:['closed','tight','tick','short','crisp','trap'],params:{attack:1,decay:.45,punch:.65,tone:.48,distortion:0,grit:0},pitchHz:330,body:.55,noise:.65 },
  { id:'hat-open',label:'Open hat',instrument:'hihat',terms:['open','long','airy','sizzle','sustained','wash'],params:{attack:.95,decay:.7,punch:.35,tone:.7,distortion:.03,grit:0},pitchHz:310,body:.6,noise:.6 },
  { id:'hat-metal',label:'Metal hat',instrument:'hihat',terms:['metallic','metal','ringing','bell','resonant'],params:{attack:1,decay:.35,punch:.55,tone:.55,resonance:.65,distortion:.06,grit:0},pitchHz:420,body:1,noise:.12 },
  { id:'hat-dust',label:'Dusty hat',instrument:'hihat',terms:['dusty','lofi','lo-fi','vintage','memphis','dark','muted'],params:{attack:.9,decay:.23,punch:.4,tone:.15,distortion:.14,grit:.45},pitchHz:265,body:.1,noise:1 },
  { id:'snare-trap',label:'Trap snap',instrument:'snare',terms:['trap','snappy','snare','crisp','tight'],params:{attack:1,decay:.5,punch:.8,tone:.55,distortion:.18,grit:0},pitchHz:195,body:.72,noise:.7,click:.15 },
  { id:'snare-clap',label:'Layered clap',instrument:'snare',terms:['clap','claps','clappy','handclap','layered','wide'],params:{attack:1,decay:.48,punch:.65,tone:.55,distortion:.12,grit:0},pitchHz:210,body:.08,noise:1,clap:true },
  { id:'snare-rim',label:'Rimshot',instrument:'snare',terms:['rim','rimshot','rim shot','woodblock','dry','stick'],params:{attack:1,decay:.08,punch:.7,tone:.55,distortion:.08,grit:0},pitchHz:440,body:1,noise:.035,click:.1,rim:true },
  { id:'snare-body',label:'Body snare',instrument:'snare',terms:['body','full','warm','fat','acoustic','boom bap','vintage'],params:{attack:.95,decay:.45,punch:.55,tone:.3,distortion:.15,grit:.08},pitchHz:170,body:1,noise:.65,click:.15 },
];
const DEFAULTS: Record<Instrument,string> = { '808':'808-punch',kick:'kick-click',hihat:'hat-closed',snare:'snare-trap' };
export function getCharacter(instrument: Instrument, id?: string): Character {
  return CHARACTERS.find(c => c.instrument === instrument && c.id === id) ?? CHARACTERS.find(c => c.id === DEFAULTS[instrument])!;
}
export function chooseCharacter(instrument: Instrument, text = ''): { character: Character; matches: string[] } {
  const words = text.toLowerCase().replace(/[^a-z0-9-]+/g,' ').trim().split(/\s+/);
  let winner = getCharacter(instrument), best = 0;
  let matches: string[] = [];
  for (const c of CHARACTERS.filter(c => c.instrument === instrument)) {
    const hits = c.terms.filter(term => {
      const tokens = term.split(' ');
      return words.some((_,i) => tokens.every((w,j) => words[i+j] === w) &&
        !words.slice(Math.max(0,i-2),i).some(w => ['no','not','without','never'].includes(w)));
    });
    // Explicit sound construction outranks generic adjectives.
    const score = hits.reduce((n,t) => n + (/spinz|zay/.test(t) ? 30 : /reese|detuned|rim|clap|slide|glid|sine|closed|open/.test(t) ? 5 : t === 'snare' ? .1 : 1),0);
    if (score > best) { best = score; winner = c; matches = hits; }
  }
  return {character:winner,matches};
}
export function characterParams(c: Character): CreativeParams { return {...DEFAULT_CREATIVE_PARAMS, ...c.params}; }
/** Decay is a shared acoustic-time mapping, used for synthesis and reference fitting. */
export function decayTime(instrument: Instrument, value: number): number {
  const ranges: Record<Instrument,[number,number]> = {'808':[.22,3.5],kick:[.045,.65],hihat:[.018,1.3],snare:[.035,.8]};
  const [min,max] = ranges[instrument];
  return min * (max/min) ** Math.max(0,Math.min(1,value));
}
export function decayParam(instrument: Instrument, seconds: number): number {
  const min = decayTime(instrument,0), max = decayTime(instrument,1);
  return Math.max(0,Math.min(1,Math.log(Math.max(min,seconds)/min)/Math.log(max/min)));
}
