import axios from "axios";

export const uploadRecording = async ({
  blob,
  title,
}: {
  blob: Blob;
  title: string;
}) => {
  const formData = new FormData();
  formData.append("file", blob);
  formData.append("title", title);

  const response = await axios.post(
    "http://localhost:8000/api/v1/recordings/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};
