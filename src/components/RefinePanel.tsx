import type { CreativeParams } from '../types';
import Waveform from './Waveform';
import Icon from './Icon';
const SLIDERS: { key: keyof CreativeParams; label: string; left: string; right: string }[] = [
  {key:'attack',label:'Attack',left:'Soft',right:'Instant'}, {key:'decay',label:'Decay',left:'Tight',right:'Long'},
  {key:'punch',label:'Punch',left:'Gentle',right:'Hard'}, {key:'tone',label:'Tone',left:'Dark',right:'Bright'},
  {key:'distortion',label:'Distortion',left:'Clean',right:'Driven'}, {key:'pitch',label:'Pitch',left:'−12 st',right:'+12 st'},
  {key:'resonance',label:'Resonance',left:'Smooth',right:'Ringing'}, {key:'grit',label:'Grit',left:'Smooth',right:'Crushed'}
];
interface Props { params: CreativeParams; onChange: (key: keyof CreativeParams, value: number) => void; buffer: AudioBuffer | null; isPlaying: boolean; isRefining: boolean; onPlayToggle: () => void; onRegenerate: () => void }
export default function RefinePanel({ params, onChange, buffer, isPlaying, isRefining, onPlayToggle }: Props) {
  return <div className="refine-panel">
    <div className="refine-preview"><div className="refine-preview-heading">SELECTED SOUND</div><Waveform buffer={buffer} isPlaying={isPlaying} color="#8d9a7d" playedColor="#ff7048" height={70} /><button type="button" className="preview-button" disabled={!buffer || isRefining} onClick={onPlayToggle}><Icon name={isPlaying ? 'stop' : isRefining ? 'loading' : 'play'} />{isRefining ? 'Applying changes…' : isPlaying ? 'Stop preview' : 'Play sound'}</button><p className="refine-identity">Fine-tune the details.<br />Keep the character.</p></div>
    <div className="slider-bank">{SLIDERS.map(s => <div key={s.key}><div className="slider-label"><label htmlFor={`slider-${s.key}`}>{s.label}</label><output htmlFor={`slider-${s.key}`}>{s.key === 'pitch' ? `${Math.round((params.pitch - .5) * 24)} st` : Math.round(params[s.key] * 100)}</output></div><input id={`slider-${s.key}`} type="range" min={0} max={1} step={s.key === 'pitch' ? 1 / 24 : .01} value={params[s.key]} onChange={e => onChange(s.key, Number(e.target.value))} /><div className="slider-extents"><span>{s.left}</span><span>{s.right}</span></div></div>)}</div>
  </div>;
}
