import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CheckIcon, PauseIcon, PlayIcon, PlusIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { useRef, useState, useEffect } from "react";
import { formatRecordingTimeWithMs } from "~/utils";
import { AnimatedFrequencyBar } from "./animated-frequency-bar";
import { uploadRecording } from "~/api/post";
import { toast } from "sonner";
import AudioRecorderDebug from "./audio-debugger";

export function AddRecordDialog() {
  const queryClient = useQueryClient();

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeTypeRef = useRef<string>("");

  const [recording, setRecording] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);

  const [title, setTitle] = useState<string>("");

  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const startTimeRef = useRef<number>(0);
  const previousElapsedMsRef = useRef<number>(0);

  // AUDIO AND MIC ENUMERATION REF
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const [audioLevel, setAudioLevel] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string | null>(null);

  const startLevelTracking = async (stream: MediaStream) => {
    try {
      const ctx = new AudioContext();

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048; // Increased for better resolution
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      // FIX: Use frequencyBinCount, not fftSize
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
        }

        const rms = Math.sqrt(sum / dataArray.length);

        // Increased multiplier and added console log for debugging
        const level = Math.min(1, rms * 10);

        // DEBUG: Uncomment to see if values are changing
        console.log("RMS:", rms.toFixed(4), "Level:", level.toFixed(4));

        setAudioLevel(level);

        rafRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch (error) {
      console.error("Error starting level tracking:", error);
      toast.error("Could not start audio level monitoring");
    }
  };

  const stopLevelTracking = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    audioContextRef.current?.close();
    setAudioLevel(0);
  };

  const startRecording = async () => {
    chunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: selectedMicId ? { exact: selectedMicId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    });

    const track = stream.getAudioTracks()[0];

    console.log("Audio track:", {
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
      settings: track.getSettings(),
    });

    console.log("Stream active:", stream.active);
    console.log("Audio tracks:", stream.getAudioTracks().length);

    streamRef.current = stream;

    await startLevelTracking(stream);

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
          ? "audio/ogg;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "audio/webm"; // Default fallback instead of empty string

    console.log("Using MIME type:", mimeType);

    mimeTypeRef.current = mimeType;

    recorderRef.current = new MediaRecorder(streamRef.current, {
      mimeType: mimeType || undefined,
    });

    recorderRef.current.ondataavailable = (e) => {
      console.log("e.data: ", e.data);

      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorderRef.current.onstop = () => {
      saveAudioRecord();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      stopLevelTracking();
      setRecording(false);
      setPaused(false);
    };

    recorderRef.current.onerror = (e) => {
      console.error("MediaRecorder error:", e);
      toast.error("Recording error occurred");
    };

    recorderRef.current.start(1000);
    setRecording(true);
    setPaused(false);
    setElapsedMs(0);
    previousElapsedMsRef.current = 0;
  };

  // const pauseRecording = () => {
  //   if (recorderRef.current && recorderRef.current.state === "recording") {
  //     recorderRef.current.pause();
  //     setPaused(true);
  //     previousElapsedMsRef.current = elapsedMs;
  //   }
  // };

  // const resumeRecording = () => {
  //   if (recorderRef.current && recorderRef.current.state === "paused") {
  //     recorderRef.current.resume();
  //     setPaused(false);
  //   }
  // };

  const downloadRecording = (blob: Blob, title: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;

    // Also update the download extension accordingly
    const ext = mimeTypeRef.current.includes("mp4")
      ? "mp4"
      : mimeTypeRef.current.includes("ogg")
        ? "ogg"
        : "webm";
    link.download = `${title}.${ext}`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
  };

  const uploadMutation = useMutation({
    mutationFn: uploadRecording,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["recordings"] });
      toast.success("Audio recording saved successfully!");
    },
  });

  const saveAudioRecord = async () => {
    const blob = new Blob(chunksRef.current, {
      type: mimeTypeRef.current || "audio/webm",
    });
    console.log(
      "Blob size to upload:",
      blob.size,
      "chunks length:",
      chunksRef.current.length
    );
    downloadRecording(blob, title);

    uploadMutation.mutate({ blob, title });
  };

  // LOAD DEVICE ENUMERATION
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Request permission and get device list
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = allDevices.filter((d) => d.kind === "audioinput");

        console.log("Audio devices found:", audioInputs);
        setDevices(audioInputs);

        if (audioInputs.length > 0 && !selectedMicId) {
          setSelectedMicId(audioInputs[0].deviceId);
        }

        // Stop the permission stream after getting device list
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.error("Error loading devices:", err);
        toast.error("Could not access microphone");
      }
    };

    loadDevices();

    return () => {
      // Cleanup permission stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    let interval: number | null = null;
    if (recording && !paused) {
      startTimeRef.current = performance.now();
      interval = window.setInterval(() => {
        setElapsedMs(
          previousElapsedMsRef.current +
            (performance.now() - startTimeRef.current)
        );
      }, 35);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [recording, paused]);

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
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
              Get started on recording your meetings, and other business agendas
            </DialogDescription>
          </DialogHeader>

          {/* <AudioRecorderDebug /> */}

          <form className="flex flex-col gap-8">
            {/* Title field */}
            <div>
              <label
                htmlFor="recording-title"
                className="block text-sm font-medium text-gray-700"
              >
                Title
              </label>
              <input
                id="recording-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Standup June 10th"
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-60 transition"
                disabled={uploadMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Microphone
              </label>
              <select
                value={selectedMicId ?? ""}
                onChange={(e) => setSelectedMicId(e.target.value)}
                className="w-full border rounded px-2 py-2 text-sm"
                disabled={recording}
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || "Unknown microphone"}
                  </option>
                ))}
              </select>
            </div>

            {/* Animated bar & time */}
            <div className="flex flex-col items-center justify-center gap-2">
              {/* <AnimatedFrequencyBar
                height={80}
                barCount={23}
                barWidth={6}
                color="#60A5FA"
                secondary="#BFDBFE"
                animate={recording && !paused}
              /> */}

              <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${audioLevel * 100}%` }}
                />
              </div>

              <span className="text-xs font-mono mt-1 text-gray-600">
                {formatRecordingTimeWithMs(elapsedMs)}
              </span>
            </div>

            {/* Full width button group at the bottom */}
            <div className="flex flex-col gap-2  w-full">
              {!recording ? (
                <button
                  onClick={startRecording}
                  className={`w-full px-4 py-2 rounded font-semibold transition ${
                    uploadMutation.isPending || !title.trim()
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:cursor-pointer hover:opacity-75"
                  }`}
                  disabled={uploadMutation.isPending || !title.trim()}
                  type="button"
                >
                  Start
                </button>
              ) : (
                <>
                  <div className="flex flex-col gap-4">
                    {/* <button
                      onClick={paused ? resumeRecording : pauseRecording}
                      className={`flex-1 px-4 py-2 rounded font-semibold transition ${
                        uploadMutation.isPending
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-gray-900 text-white hover:opacity-75 hover:cursor-pointer"
                      }`}
                      disabled={uploadMutation.isPending}
                      type="button"
                    >
                      {paused ? (
                        <span className="flex items-center justify-center gap-2">
                          <PlayIcon className="size-5" />
                          Resume
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <PauseIcon className="size-5" />
                          Pause
                        </span>
                      )}
                    </button> */}
                    <button
                      onClick={stopRecording}
                      className={`flex justify-center items-center gap-1 px-4 py-2 rounded font-semibold transition ${
                        uploadMutation.isPending
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:cursor-pointer hover:opacity-75"
                      }`}
                      disabled={uploadMutation.isPending}
                      type="button"
                    >
                      <CheckIcon className="size-5" />
                      {uploadMutation.isPending ? "Saving..." : "Save"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
