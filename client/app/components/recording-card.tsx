import { Files } from "lucide-react";
import React, { useRef, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { formatAudioRecordedTime } from "~/utils";

export function RecordingCard({
  title,
  created_at,
  src,
}: {
  title: string;
  created_at: string;
  src: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  const handleBackward = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(audio.currentTime - 10, 0);
    }
  };

  const handleForward = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.min(audio.currentTime + 10, duration);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio) {
      setDuration(audio.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const value = parseFloat(e.target.value);
    if (audio) {
      audio.currentTime = value;
      setCurrentTime(value);
    }
  };

  console.log("audioRef.current.duration: ", audioRef?.current?.duration);
  

  return (
    <div className="relative bg-white rounded-lg shadow p-6 flex flex-col gap-3 w-full max-w-xl mx-auto mb-6 border">
      <Tooltip>
        <TooltipTrigger className="absolute top-2 right-3 hover:cursor-pointer hover:opacity-75">
          <Files className="size-5 text-gray-600" />
        </TooltipTrigger>
        <TooltipContent>
          <p>View summarized document</p>
        </TooltipContent>
      </Tooltip>
      <h2 className="text-lg font-semibold">{title}</h2>
      <span className="text-xs text-gray-500">{created_at}</span>

      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={handlePlay}
        onPause={handlePause}
        preload="auto"
        className="hidden"
      />

      {/* AUDIO ACTIONS AND TIME */}
      <div className="flex items-center gap-3 mt-2">
        {/* Backward */}
        <button
          type="button"
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200"
          onClick={handleBackward}
          aria-label="Backward 10 seconds"
        >
          {/* Rewind Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            width={24}
            height={24}
            viewBox="0 0 24 24"
          >
            <path
              d="M17 17V7M7 12L17 7V17L7 12Z"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {/* Play/Pause */}
        <button
          type="button"
          className="p-3 rounded-full bg-blue-600 text-white shadow hover:bg-blue-700 transition active:bg-blue-800"
          onClick={handlePlayPause}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            // Pause Icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              width={28}
              height={28}
              viewBox="0 0 28 28"
            >
              <rect
                x="7"
                y="7"
                width="4"
                height="14"
                rx="2"
                fill="currentColor"
              />
              <rect
                x="17"
                y="7"
                width="4"
                height="14"
                rx="2"
                fill="currentColor"
              />
            </svg>
          ) : (
            // Play Icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              width={28}
              height={28}
              viewBox="0 0 28 28"
            >
              <path d="M10 8L20 14L10 20V8Z" fill="currentColor" />
            </svg>
          )}
        </button>
        {/* Forward */}
        <button
          type="button"
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200"
          onClick={handleForward}
          aria-label="Forward 10 seconds"
        >
          {/* Fast-forward Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            width={24}
            height={24}
            viewBox="0 0 24 24"
          >
            <path
              d="M7 7V17M17 12L7 17V7L17 12Z"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {/* Time */}
        <span className="text-xs ml-3">
          {formatAudioRecordedTime(currentTime)} /{" "}
          {formatAudioRecordedTime(duration)}
        </span>
      </div>
      {/* Slider */}
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime}
        onChange={handleSliderChange}
        className="w-full accent-blue-600"
      />
    </div>
  );
}
