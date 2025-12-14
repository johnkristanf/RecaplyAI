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

export function AddRecordDialog() {
  const queryClient = useQueryClient();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [recording, setRecording] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);

  const [title, setTitle] = useState<string>("");

  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const startTimeRef = useRef<number>(0);
  const previousElapsedMsRef = useRef<number>(0);

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

  const startRecording = async () => {
    chunksRef.current = [];

    streamRef.current = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    recorderRef.current = new MediaRecorder(streamRef.current, {
      mimeType: "audio/webm;codecs=opus",
    });

    recorderRef.current.ondataavailable = (e) => {
      console.log("e.data: ", e.data);

      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorderRef.current.onstop = saveAudioRecord;

    recorderRef.current.start(100);
    setRecording(true);
    setPaused(false);
    setElapsedMs(0);
    previousElapsedMsRef.current = 0;
  };

  const pauseRecording = () => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.pause();
      setPaused(true);
      previousElapsedMsRef.current = elapsedMs;
    }
  };

  const resumeRecording = () => {
    if (recorderRef.current && recorderRef.current.state === "paused") {
      recorderRef.current.resume();
      setPaused(false);
    }
  };

  const saveAndStopRecording = () => {
    if (!recorderRef.current) return;

    // Don't use setTimeout, just stop directly
    if (recorderRef.current.state === "paused") {
      recorderRef.current.resume();
    }

    // Stop after a microtask to ensure resume completes
    Promise.resolve().then(() => {
      recorderRef.current?.stop();
    });

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setRecording(false);
    setPaused(false);
  };

  const uploadMutation = useMutation({
    mutationFn: uploadRecording,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["recordings"] });
      toast.success("Audio recording saved successfully!");
    },
  });

  const saveAudioRecord = async () => {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    console.log(
      "Blob size to upload:",
      blob.size,
      "chunks length:",
      chunksRef.current.length
    );

    uploadMutation.mutate({ blob, title });
  };

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

          <form className="flex flex-col gap-10">
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

            {/* Animated bar & time */}
            <div className="flex flex-col items-center justify-center gap-2">
              <AnimatedFrequencyBar
                height={80}
                barCount={23}
                barWidth={6}
                color="#60A5FA"
                secondary="#BFDBFE"
                animate={recording && !paused}
              />
              <span className="text-xs font-mono mt-1 text-gray-600">
                {formatRecordingTimeWithMs(elapsedMs)}
              </span>
            </div>

            {/* Full width button group at the bottom */}
            <div className="flex flex-col gap-2 mt-4 w-full">
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
                    <button
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
                    </button>
                    <button
                      onClick={saveAndStopRecording}
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
