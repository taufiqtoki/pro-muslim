import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface WaveformVisualizerProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ audioRef, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioRef.current || !canvasRef.current) return;

    // Clean up previous audio context and nodes
    if (audioContextRef.current) {
      sourceNodeRef.current?.disconnect();
      analyserRef.current?.disconnect();
      audioContextRef.current.close();
    }

    // Create new audio context and nodes
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      analyserRef.current = audioContextRef.current.createAnalyser();

      sourceNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;

      const draw = () => {
        if (!analyserRef.current || !canvas || !isPlaying) return;

        animationFrameRef.current = requestAnimationFrame(draw);
        analyserRef.current.getByteFrequencyData(dataArray);

        ctx.fillStyle = 'rgb(20, 20, 20)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 2;
          ctx.fillStyle = `rgb(50, ${barHeight + 100}, 50)`;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      };

      if (isPlaying) {
        draw();
      }
    } catch (error) {
      console.error('Error initializing audio visualizer:', error);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioRef.current]); // Only recreate when audio element changes

  useEffect(() => {
    // Handle play/pause state
    if (isPlaying && canvasRef.current) {
      const draw = () => {
        if (!analyserRef.current || !canvasRef.current || !isPlaying) return;
        // ... rest of draw function ...
      };
      draw();
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [isPlaying]);

  return (
    <Box sx={{ mt: 2, width: '100%', height: '60px' }}>
      <canvas
        ref={canvasRef}
        width={500}
        height={60}
        style={{ width: '100%', height: '100%' }}
      />
    </Box>
  );
};

export default WaveformVisualizer;
