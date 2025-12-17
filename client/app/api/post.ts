import axios from "axios";

export const uploadRecording = async ({
  blob,
  title,
}: {
  blob: Blob;
  title: string;
}) => {
  const formData = new FormData();
  formData.append("audio_file", blob);
  formData.append("title", title);

  const response = await axios.post(
    "http://10.0.0.50:8001/transcribe",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};
