'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useStore } from '@/hooks/useStore';
import { computePositions } from '@/lib/layoutEngine';
import { CHAINS, type ChainKey } from '@/lib/constants';
import type { UnifiedToken } from '@/lib/types';

const MAX = 5000;
const ATLAS = 4096;
const TILE = 64;
const TPR = ATLAS / TILE;
const TUV = TILE / ATLAS;
const _c = new THREE.Color();

const VERT = `
attribute vec2 aUV;
varying vec2 vUv;
void main() {
  vUv = uv * ${TUV.toFixed(10)} + aUV;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
`;
const FRAG = `
uniform sampler2D uAtlas;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(uAtlas, vUv);
}
`;

export default function Scene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0a0a0f);
    renderer.domElement.style.cursor = 'crosshair';
    el.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.1, 2000
    );
    camera.position.set(0, 0, 80);

    const scene = new THREE.Scene();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 500;
    controls.panSpeed = 0.8;
    controls.rotateSpeed = 0.5;

    // Atlas
    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = ATLAS;
    atlasCanvas.height = ATLAS;
    const ctx = atlasCanvas.getContext('2d')!;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, ATLAS, ATLAS);

    const atlasTex = new THREE.CanvasTexture(atlasCanvas);
    atlasTex.minFilter = THREE.LinearFilter;
    atlasTex.magFilter = THREE.LinearFilter;
    atlasTex.generateMipmaps = false;

    const shaderMat = new THREE.ShaderMaterial({
      uniforms: { uAtlas: { value: atlasTex } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.DoubleSide,
    });

    const geo = new THREE.PlaneGeometry(0.8, 0.8);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 500);
    const mesh = new THREE.InstancedMesh(geo, shaderMat, MAX);
    mesh.count = 0;
    mesh.frustumCulled = false;
    scene.add(mesh);

    const uvData = new Float32Array(MAX * 2);
    const uvAttr = new THREE.InstancedBufferAttribute(uvData, 2);
    geo.setAttribute('aUV', uvAttr);

    const curr = new Float32Array(MAX * 3);
    const tgt = new Float32Array(MAX * 3);
    let settled = true;
    let atlasDirty = false;
    let tokenList: UnifiedToken[] = [];
    let prevTokens: UnifiedToken[] = [];
    let prevFilters = useStore.getState().filters;
    const loaded = new Set<string>();
    let loadCancel = false;

    function rebuild() {
      const state = useStore.getState();
      const filtered = state.getFilteredTokens();
      const positioned = computePositions(filtered, state.filters.sortBy, state.filters.density);

      const oldCount = mesh.count;
      const count = positioned.length;
      const buf = mesh.instanceMatrix.array as Float32Array;

      loadCancel = true;
      setTimeout(() => { loadCancel = false; startImageLoads(positioned, count); }, 0);

      for (let i = 0; i < count; i++) {
        const token = positioned[i];
        const pos = token.position || [0, 0, 0];
        const i3 = i * 3;

        tgt[i3] = pos[0];
        tgt[i3 + 1] = pos[1];
        tgt[i3 + 2] = pos[2];

        if (i >= oldCount) {
          curr[i3] = pos[0];
          curr[i3 + 1] = pos[1];
          curr[i3 + 2] = pos[2];
          const b = i * 16;
          buf[b] = 1; buf[b + 1] = 0; buf[b + 2] = 0; buf[b + 3] = 0;
          buf[b + 4] = 0; buf[b + 5] = 1; buf[b + 6] = 0; buf[b + 7] = 0;
          buf[b + 8] = 0; buf[b + 9] = 0; buf[b + 10] = 1; buf[b + 11] = 0;
          buf[b + 12] = pos[0]; buf[b + 13] = pos[1]; buf[b + 14] = pos[2]; buf[b + 15] = 1;
        }

        const col = i % TPR;
        const row = Math.floor(i / TPR);
        uvData[i * 2] = col * TUV;
        uvData[i * 2 + 1] = 1.0 - (row + 1) * TUV;

        if (!loaded.has(token.id)) {
          const cc = CHAINS[token.chain as ChainKey]?.color || '#444';
          ctx.fillStyle = cc;
          ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
        }
      }

      uvAttr.needsUpdate = true;
      mesh.instanceMatrix.needsUpdate = true;
      atlasDirty = true;
      mesh.count = count;
      tokenList = positioned;
      settled = false;
    }

    // Concurrent image loader — 50 at a time, no delays
    // On CORS failure, retries through server proxy
    function startImageLoads(tokens: UnifiedToken[], count: number) {
      let nextIdx = 0;
      let active = 0;

      function drawTile(img: HTMLImageElement, i: number) {
        if (loadCancel) return;
        const c = i % TPR;
        const r = Math.floor(i / TPR);
        ctx.drawImage(img, c * TILE, r * TILE, TILE, TILE);
        atlasDirty = true;
      }

      function done(id: string) {
        loaded.add(id);
        active--;
        loadNext();
      }

      function loadOne(i: number, url: string, id: string, proxied: boolean) {
        active++;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { drawTile(img, i); done(id); };
        img.onerror = () => {
          if (!proxied) {
            active--;
            loadOne(i, '/api/image?url=' + encodeURIComponent(url), id, true);
          } else {
            done(id);
          }
        };
        img.src = proxied ? url : url;
      }

      function loadNext() {
        while (active < 50 && nextIdx < count) {
          const i = nextIdx++;
          const token = tokens[i];
          if (loaded.has(token.id)) continue;
          const url = token.media.thumbnail || token.media.image;
          if (!url) { loaded.add(token.id); continue; }
          loadOne(i, url, token.id, false);
        }
      }
      loadNext();
    }

    const unsub = useStore.subscribe((state) => {
      if (state.tokens !== prevTokens || state.filters !== prevFilters) {
        prevTokens = state.tokens;
        prevFilters = state.filters;
        rebuild();
      }
    });
    rebuild();

    // Click — track drag to differentiate from orbit
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0, downY = 0;

    renderer.domElement.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
    });

    renderer.domElement.addEventListener('pointerup', (e) => {
      const dx = e.clientX - downX;
      const dy = e.clientY - downY;
      if (dx * dx + dy * dy > 9) return;

      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(mesh);
      if (hits.length > 0 && hits[0].instanceId !== undefined) {
        const token = tokenList[hits[0].instanceId];
        if (token) useStore.getState().setSelectedToken(token);
      }
    });

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    let raf: number;
    let last = performance.now();

    function animate() {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;

      controls.update();

      if (atlasDirty) {
        atlasTex.needsUpdate = true;
        atlasDirty = false;
      }

      if (!settled && mesh.count > 0) {
        const f = 1 - Math.pow(0.92, dt * 60);
        const buf = mesh.instanceMatrix.array as Float32Array;
        let moving = false;

        for (let i = 0; i < mesh.count; i++) {
          const i3 = i * 3;
          const dx = tgt[i3] - curr[i3];
          const dy = tgt[i3 + 1] - curr[i3 + 1];
          const dz = tgt[i3 + 2] - curr[i3 + 2];
          if (dx * dx + dy * dy + dz * dz < 0.00001) continue;
          moving = true;
          curr[i3] += dx * f;
          curr[i3 + 1] += dy * f;
          curr[i3 + 2] += dz * f;
          buf[i * 16 + 12] = curr[i3];
          buf[i * 16 + 13] = curr[i3 + 1];
          buf[i * 16 + 14] = curr[i3 + 2];
        }

        if (moving) mesh.instanceMatrix.needsUpdate = true;
        else settled = true;
      }

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      loadCancel = true;
      cancelAnimationFrame(raf);
      unsub();
      window.removeEventListener('resize', onResize);
      controls.dispose();
      geo.dispose();
      shaderMat.dispose();
      atlasTex.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0 }} />;
}
