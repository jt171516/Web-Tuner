import { useRef, useState, useCallback, useEffect } from 'react';
import { PitchDetector } from 'pitchy';

// Note names
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function useTuner() {
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [error, setError] = useState('');

  // Tuner state
  const [pitchHz, setPitchHz] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [cents, setCents] = useState<number | null>(null);
  const [clarity, setClarity] = useState<number | null>(null);

  // Settings
  const [a4, setA4] = useState(440);

  // Refs for Audio Engine
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const detectorRef = useRef<ReturnType<typeof PitchDetector.forFloat32Array> | null>(null);
  const inputRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Smoothing regs
  const smoothedPitchRef = useRef<number | null>(null);
  const ALPHA = 0.15; // Smoothing factor, lower is smoother, higher is more responsive

  // Helper for note calculation
  const updateNoteData = useCallback((freq: number) => {
    const noteNumber = 69 + 12 * Math.log2(freq / a4);
    const nearestNoteNumber = Math.round(noteNumber);
    const noteIndex = ((nearestNoteNumber % 12) + 12) % 12;
    const octave = Math.floor(nearestNoteNumber / 12) - 1;
    const targetFreq = a4 * Math.pow(2, (nearestNoteNumber - 69) / 12);
    const centsVal = 1200 * Math.log2(freq / targetFreq);

    setNote(`${NOTE_NAMES[noteIndex]}${octave}`);
    setCents(centsVal);
  }, [a4]);

  // Engine cleanup
  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    analyserRef.current?.disconnect();
    if (audioCtxRef.current?.state !== 'closed') audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());

    setStatus('idle');
    setPitchHz(null);
    setNote(null);
    setCents(null);
    setClarity(null);
    smoothedPitchRef.current = null;
  }, []);

  // Main engine start
  const start = useCallback(async (micId: string) => {
    try {
      if (!window.isSecureContext) throw new Error('Microphone access requires a secure context (HTTPS).');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: micId === 'default' ? undefined : { exact: micId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      await audioCtx.resume();

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      source.connect(analyser);

      const inputBuffer = new ArrayBuffer(analyser.fftSize * 4);
      const input = new Float32Array(inputBuffer);
      inputRef.current = input;
      detectorRef.current = PitchDetector.forFloat32Array(analyser.fftSize);

      setStatus('running');

      // Tuning loop
      const loop = () => {
        if (!analyserRef.current || !detectorRef.current || !inputRef.current) return;

        analyserRef.current.getFloatTimeDomainData(inputRef.current);

        const [pitch, c] = detectorRef.current.findPitch(inputRef.current, audioCtx.sampleRate);

        if (c > 0.9 && pitch > 0) {
          // Apply smoothing
          const prev = smoothedPitchRef.current;
          const smoothed = prev == null ? pitch : prev + ALPHA * (pitch - prev);
          smoothedPitchRef.current = smoothed;

          setPitchHz(smoothed);
          setClarity(c);
          updateNoteData(smoothed);
        }
        else {
          // No reliable pitch detected
          setClarity(c);
        }

        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    }
    catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
      stop();
    }
  }, [updateNoteData, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    start,
    stop,
    status,
    pitchHz,
    note,
    cents,
    clarity,
    error,
    a4,
    setA4
  };
}