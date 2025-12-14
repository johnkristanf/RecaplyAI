import { PlusIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

import { useRef, useState, useEffect } from "react";

// Helper to format ms to mm:ss:ms
function formatTimeMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10); // two digits
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(2, "0")}`;
}

export function AddRecordDialog() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [recording, setRecording] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [audioId, setAudioId] = useState<string | null>(null);

  // Timer state
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  useEffect(() => {
    let interval: number | null = null;
    if (recording) {
      setElapsedMs(0);
      const start = performance.now();
      interval = window.setInterval(() => {
        setElapsedMs(performance.now() - start);
      }, 35); // frequent update for ms
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [recording]);

  const startRecording = async () => {
    streamRef.current = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    recorderRef.current = new MediaRecorder(streamRef.current, {
      mimeType: "audio/webm;codecs=opus",
    });

    recorderRef.current.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };

    recorderRef.current.onstop = uploadAudio;

    recorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (recorderRef.current) recorderRef.current.stop();
    if (streamRef.current)
      streamRef.current.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  const uploadAudio = async () => {
    setUploading(true);

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];

    const formData = new FormData();
    formData.append("file", blob, "recording.webm");

    const res = await fetch("/api/audio/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setAudioId(data.audio_id);

    setUploading(false);
  };

  return (
    <>
      {/* Progress bar keyframes for indeterminate style */}
      <style>
        {`
          @keyframes slide-marquee {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(300%);
            }
          }
          .animate-marquee {
            animation: slide-marquee 1s linear infinite;
          }
        `}
      </style>
      <Dialog>
        <DialogTrigger>
          <button
            type="button"
            className="w-full min-h-[200px] flex flex-col items-center justify-center border-2 border-dashed border-blue-600 rounded-lg bg-white hover:cursor-pointer hover:opacity-75 transition px-6 py-6 text-blue-500"
          >
            <PlusIcon className="size-14" />
            <span className="font-medium">Add New Recording</span>
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Audio Recording</DialogTitle>
            <DialogDescription>
              <div className="space-y-4">
                <button
                  onClick={recording ? stopRecording : startRecording}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                  disabled={uploading}
                >
                  {recording ? "Stop Recording" : "Start Recording"}
                </button>
                <div className="flex flex-col items-center justify-center gap-2 mt-4">
                  {recording && (
                    <>
                      {/* Progress Bar (indeterminate, since no max) */}
                      <div className="w-full flex flex-col items-center mb-1">
                        <div className="w-full bg-gray-200 rounded h-3 overflow-hidden relative">
                          <div
                            className="animate-marquee bg-blue-400 h-3 rounded"
                            style={{
                              width: "33%",
                              minWidth: 60,
                            }}
                          ></div>
                        </div>
                        <span className="text-xs font-mono mt-1 text-gray-600">
                          {formatTimeMs(elapsedMs)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                {uploading && <p>Uploading audio...</p>}
                {audioId && <p>✅ Uploaded (ID: {audioId})</p>}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
 