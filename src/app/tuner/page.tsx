// run component on client side in browser
'use client';

import { useEffect, useRef, useState } from 'react';

// Custom type for status
type Status = 'idle' | 'running' | 'error';

export default function TunerPage() {
  // State to manage the status
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [secureContext, setSecureContext] = useState<boolean | null>(null);

  // Ref as a container for MediaStream object
  const streamRef = useRef<MediaStream | null>(null);

  async function start() {
    setError('');
    try {
      // Block microphone access on HTTP
      if (!window.isSecureContext) {
        throw new Error('Microphone access requires a secure context (HTTPS).');
      }

      // Check if browser has media capabilities
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Media devices API not supported in this browser.');
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // turn off filters to get raw audio data
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Store the stream in the ref
      streamRef.current = stream;
      setStatus('running');
    }

    catch (err: unknown) {
      setStatus('error');
      if (err instanceof Error) {
        setError(err.message);
      }
      else {
        setError('Failed to access microphone.');
      }
    }
  }

  function stop() {
    // Stop all tracks in the MediaStream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus('idle');
  }

  // Cleanup on unmount
  useEffect(() => {
    setSecureContext(window.isSecureContext);

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Render UI based on status
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold">Mic Test</h1>
      <p className="mt-2">
        Secure context:{' '}
        <b>{secureContext === null ? 'Checking...' : String(secureContext)}</b>
      </p>

      <div className="mt-4 flex gap-3">
        <button 
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50" 
          onClick={start} 
          disabled={status === 'running'}
        >
          Start mic
        </button>
        <button 
          className="rounded border px-4 py-2 disabled:opacity-50" 
          onClick={stop} 
          disabled={status !== 'running'}
        >
          Stop
        </button>
      </div>

      <p className="mt-4">Status: <b>{status}</b></p>
      {error && <p className="mt-3 text-red-600">{error}</p>}
    </main>
  );
}