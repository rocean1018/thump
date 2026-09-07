import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { CreativeParams, Instrument } from '../types';
import { peekAnalyser } from '../audio/playback';
interface Props { instrument: Instrument; params: CreativeParams; generating: boolean; motion: boolean }
export default function SoundSculpture(props: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const state = useRef(props); state.current = props;
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'default' }); }
    catch { setUnavailable(true); return; }
    let pixelRatio = Math.min(devicePixelRatio, 1);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .9;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 30);
    camera.position.set(0, 0, 7.2);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, .03);
    scene.environment = env.texture;
    room.dispose(); pmrem.dispose();
    const assembly = new THREE.Group(); scene.add(assembly);
    const geometry = new THREE.TorusGeometry(1.16, .37, 20, 192);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
      const a = Math.atan2(y, x), cX = Math.cos(a) * 1.16, cY = Math.sin(a) * 1.16;
      const rib = 1 + .075 * Math.cos(a * 48);
      position.setXYZ(i, cX + (x - cX) * rib, cY + (y - cY) * rib, z * rib);
    }
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color: 0xe5e4df, metalness: 1, roughness: .23, envMapIntensity: 1.3 });
    const body = new THREE.Mesh(geometry, material); assembly.add(body);
    const rimGeometry = new THREE.TorusGeometry(.795, .025, 8, 96);
    const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xff7048, emissive: 0xcc3812, emissiveIntensity: .22, roughness: .3, metalness: .7 });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial); rim.position.z = .05; assembly.add(rim);
    const insetGeometry = new THREE.TorusGeometry(.68, .035, 8, 96);
    const inset = new THREE.Mesh(insetGeometry, material); inset.position.z = -.17; assembly.add(inset);
    const backGeometry = new THREE.TorusGeometry(1.2, .025, 8, 96);
    const back = new THREE.Mesh(backGeometry, material); back.position.z = -.43; assembly.add(back);
    const key = new THREE.DirectionalLight(0xfff7e8, 4); key.position.set(-3, 5, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xa4b2c3, 2); fill.position.set(4, -1, 3); scene.add(fill);
    const warm = new THREE.PointLight(0xff5c23, 9, 10); warm.position.set(-2, -2, 2); scene.add(warm);
    let needsFrame = true;
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); needsFrame = true;
    };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const motionChange = () => { needsFrame = true; };
    reduced.addEventListener('change', motionChange);
    let frame = 0, last = 0, time = 0, energy = 0, slowFrames = 0;
    let inView = true, lastState: Props | null = null;
    let samples = new Float32Array(2048);
    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (document.hidden || !inView) { last = now; return; }
      const elapsed = now - last;
      const dt = Math.min(elapsed / 1000, .08); last = now;
      const { instrument, params, generating, motion } = state.current;
      const animate = motion && !reduced.matches;
      if (!animate && lastState === state.current && !needsFrame) return;
      lastState = state.current;
      needsFrame = false;
      if (animate) time += dt;
      // Lower fill cost on slower devices; don't oscillate resolution every frame.
      slowFrames = elapsed > 25 && elapsed < 100 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames > 40 && pixelRatio > .75) { pixelRatio = .75; renderer.setPixelRatio(pixelRatio); resize(); slowFrames = 0; }
      let rms = 0;
      const analyser = peekAnalyser();
      if (analyser && animate) {
        if (samples.length !== analyser.fftSize) samples = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(samples);
        for (let i = 0; i < samples.length; i++) rms += samples[i] ** 2;
        rms = Math.sqrt(rms / samples.length);
      }
      const target = Math.min(1, Math.sqrt(rms) * 2.1);
      energy += (target - energy) * (1 - Math.exp(-dt / (target > energy ? .018 : .2)));
      const pulse = animate ? energy * .19 + (generating ? .04 * Math.sin(time * 9) : 0) : 0;
      const shape = instrument === 'hihat' ? .57 : instrument === 'snare' ? .8 : 1;
      // A continuous, autonomous idle. Pointer movement never changes the pose.
      assembly.rotation.set(.35 + (animate ? Math.sin(time * .55) * .28 + energy * .18 : 0), -.48 + (animate ? Math.sin(time * .4) * .48 : 0), -.24 + (animate ? time * .16 : 0));
      assembly.scale.setScalar(1 + pulse);
      body.scale.z = shape + params.decay * .12 + pulse * .8;
      inset.rotation.y = animate ? Math.sin(time * .8) * .4 + energy * .3 : 0;
      back.rotation.x = animate ? Math.sin(time * .6) * .22 : 0;
      rim.scale.setScalar(1 + pulse * .8); rimMaterial.emissiveIntensity = .22 + energy * 1.2 + params.distortion * .35;
      material.roughness = .17 + params.grit * .2;
      renderer.render(scene, camera);
    };
    const intersection = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, { threshold: 0 });
    intersection.observe(host);
    frame = requestAnimationFrame(render);
    const lost = (e: Event) => { e.preventDefault(); setUnavailable(true); cancelAnimationFrame(frame); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect();
      reduced.removeEventListener('change', motionChange);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      geometry.dispose(); rimGeometry.dispose(); insetGeometry.dispose(); backGeometry.dispose(); material.dispose(); rimMaterial.dispose(); env.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return <div ref={mount} className="sculpture-canvas" aria-hidden="true">{unavailable && <div className="scene-fallback">Your sound is ready to take shape.<br />3D preview unavailable on this device.</div>}</div>;
}
