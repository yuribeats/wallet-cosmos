'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/hooks/useStore';

const SCREEN_NODE_INDEX = 0;

function HandheldModel({ videoRef, audioMode, thumbnailUrl }: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioMode: boolean;
  thumbnailUrl?: string;
}) {
  const { scene } = useGLTF('/handheld.glb');
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const screenMeshRef = useRef<THREE.Mesh | null>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const imageTextureRef = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    const meshes: THREE.Mesh[] = [];
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
    });
    if (meshes.length > SCREEN_NODE_INDEX) {
      screenMeshRef.current = meshes[SCREEN_NODE_INDEX];
    }
  }, [clonedScene]);

  useEffect(() => {
    if (!screenMeshRef.current) return;
    const mesh = screenMeshRef.current;

    if (!audioMode && videoRef.current) {
      const tex = new THREE.VideoTexture(videoRef.current);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      videoTextureRef.current = tex;

      mesh.material = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    } else if (audioMode && thumbnailUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(thumbnailUrl, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        imageTextureRef.current = tex;
        mesh.material = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
      });
    } else {
      mesh.material = new THREE.MeshBasicMaterial({ color: '#111', side: THREE.DoubleSide });
    }

    return () => {
      videoTextureRef.current?.dispose();
      imageTextureRef.current?.dispose();
    };
  }, [audioMode, thumbnailUrl, videoRef]);

  useFrame(() => {
    if (videoTextureRef.current && !audioMode) {
      videoTextureRef.current.needsUpdate = true;
    }
  });

  return <primitive object={clonedScene} />;
}

function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 0, 0.13);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

export default function PlaylistPlayer() {
  const playlistTokens = useStore((s) => s.playlistTokens);
  const playlistIndex = useStore((s) => s.playlistIndex);
  const closePlaylist = useStore((s) => s.closePlaylist);
  const nextTrack = useStore((s) => s.nextTrack);
  const prevTrack = useStore((s) => s.prevTrack);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(true);
  const isMobile = useIsMobile();

  const current = playlistTokens[playlistIndex];
  const isAudio = current?.media.mediaType === 'audio';
  const mediaSrc = isAudio
    ? current?.media.audio
    : (current?.media.video || current?.media.image);

  const handleEnded = useCallback(() => {
    nextTrack();
  }, [nextTrack]);

  useEffect(() => {
    setPlaying(true);
  }, [playlistIndex]);

  useEffect(() => {
    const el = isAudio ? audioRef.current : videoRef.current;
    if (!el) return;
    if (playing) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [playing, isAudio, mediaSrc]);

  if (!current) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 300,
      background: 'rgba(10, 10, 15, 0.97)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'inherit',
      color: '#fff',
    }}>
      <button
        onClick={closePlaylist}
        style={{
          position: 'absolute',
          top: isMobile ? '10px' : '20px',
          right: isMobile ? '10px' : '20px',
          background: 'none',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#666',
          padding: '6px 12px',
          fontSize: '10px',
          fontWeight: 'bold',
          fontFamily: 'inherit',
          textTransform: 'uppercase',
          cursor: 'crosshair',
          letterSpacing: '0.05em',
          zIndex: 10,
        }}
      >
        CLOSE
      </button>

      <div style={{
        width: isMobile ? '100vw' : '70vmin',
        height: isMobile ? '60vh' : '70vmin',
        position: 'relative',
      }}>
        <Canvas
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <CameraSetup />
          <ambientLight intensity={1.5} />
          <directionalLight position={[2, 2, 5]} intensity={1} />
          <HandheldModel
            videoRef={videoRef}
            audioMode={isAudio}
            thumbnailUrl={current.media.thumbnail || current.media.image}
          />
          <OrbitControls
            enableZoom={true}
            enablePan={false}
            minDistance={0.05}
            maxDistance={0.4}
            dampingFactor={0.1}
          />
        </Canvas>
      </div>

      {/* Hidden media elements driving the textures */}
      <video
        ref={videoRef}
        key={isAudio ? undefined : mediaSrc}
        src={isAudio ? undefined : mediaSrc}
        crossOrigin="anonymous"
        autoPlay
        playsInline
        muted={false}
        onEnded={handleEnded}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
      {isAudio && (
        <audio
          ref={audioRef}
          key={mediaSrc}
          src={mediaSrc}
          crossOrigin="anonymous"
          autoPlay
          onEnded={handleEnded}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        />
      )}

      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '12px' : '16px',
        marginTop: '8px',
      }}>
        <button onClick={prevTrack} style={controlBtnStyle}>
          PREV
        </button>
        <button onClick={() => setPlaying(!playing)} style={controlBtnStyle}>
          {playing ? 'PAUSE' : 'PLAY'}
        </button>
        <button onClick={nextTrack} style={controlBtnStyle}>
          NEXT
        </button>
      </div>

      <div style={{
        marginTop: '12px',
        textAlign: 'center',
        maxWidth: '80vw',
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {current.name}
        </div>
        <div style={{
          fontSize: '9px',
          color: '#555',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginTop: '4px',
        }}>
          {playlistIndex + 1} / {playlistTokens.length}
          {isAudio ? ' \u00B7 AUDIO' : ' \u00B7 VIDEO'}
        </div>
      </div>
    </div>
  );
}

const controlBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#fff',
  padding: '8px 16px',
  fontSize: '10px',
  fontWeight: 'bold',
  fontFamily: 'inherit',
  textTransform: 'uppercase',
  cursor: 'crosshair',
  letterSpacing: '0.05em',
};
