"use client";

import { useState, useRef } from "react";
import { Play, Pause, Volume2, AlertCircle } from "lucide-react";

export function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const toggle = () => {
    const el = audioRef.current;
    if (!el || error) return;
    if (playing) {
      el.pause();
    } else {
      el.play().catch(() => setError(true));
    }
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-red-500">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        Ses kaydına ulaşılamıyor
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <button
        onClick={toggle}
        disabled={!loaded}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={() => setLoaded(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setError(true)}
        controls
        className="flex-1 h-8"
        style={{ accentColor: "hsl(var(--primary))" }}
      />
      <Volume2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
    </div>
  );
}
