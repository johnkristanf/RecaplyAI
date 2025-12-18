import { AddRecordDialog } from "~/components/add-recording-dialog";
import { RecordingCard } from "~/components/recording-card";
import { useQuery } from "@tanstack/react-query";
import type { Recording } from "~/types/recordings";
import { fetchRecordings } from "~/api/get";

export function meta() {
  return [
    { title: "Recordings" },
    { name: "description", content: "Browse all your recordings." },
  ];
}

export default function RecordingsPage() {
  // useQuery must be inside the component so it can access the context
  const { data: recordings = [] } = useQuery<Recording[]>({
    queryKey: ["recordings"],
    queryFn: fetchRecordings,
  });

  return (
    <div className="w-full pt-6 ">
      <h1 className="text-2xl font-bold mb-6">Recordings</h1>
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* {recordings && recordings.length > 0 && (
          <>
            {recordings.map((rec) => (
              <RecordingCard key={rec.id} {...rec} />
            ))}
          </>
        )} */}
        <AddRecordDialog />
      </div>
    </div>
  );
}
