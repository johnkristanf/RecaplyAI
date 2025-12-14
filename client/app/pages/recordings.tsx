import { AddRecordDialog } from "~/components/add-recording-dialog";
import { RecordingCard } from "~/components/recording-card";

export function meta() {
  return [
    { title: "Recordings" },
    { name: "description", content: "Browse all your recordings." },
  ];
}

// Sample data for recordings. In real use, replace with actual data.
const recordings = [
  {
    id: 1,
    title: "Meeting with Team",
    date: "2024-06-11",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    id: 2,
    title: "Lecture: React Basics",
    date: "2024-06-09",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    id: 3,
    title: "Daily Standup",
    date: "2024-06-08",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
];

export default function RecordingsPage() {
  return (
    <div className="w-full pt-6 ">
      <h1 className="text-2xl font-bold mb-6">Recordings</h1>
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {recordings && recordings.length > 0 && (
          <>
            {recordings.map((rec) => (
              <RecordingCard key={rec.id} {...rec} />
            ))}
            <AddRecordDialog />
          </>
        )}
      </div>
    </div>
  );
}
