import httpx
import ollama
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas
from faster_whisper import WhisperModel
from transformers import pipeline
import torch


class RecordingService:
    """
    Service class encapsulating the logic for processing, converting, uploading,
    and persisting recordings.
    """

    async def ollama_model_summarize(self, transcribed_meeting_text, model):
        """
        Performs inference using an Ollama model (e.g., summarization with Qwen).

        Args:
            audio_file_path: str -- path to the audio file (wav/m4a)
            model: str -- Ollama model name (default: "whisper")

        Returns:
            dict: result of inference (e.g., transcript or prediction)
        """

        client = ollama.AsyncClient(host="http://10.0.0.50:11434")
        with open("src/prompts/summarize_prompt.md", "r", encoding="utf-8") as f:
            template = f.read()

        prompt = template.replace("{{RAW_MEETING_TEXT}}", transcribed_meeting_text)
        print(f"PROMPT: {prompt}")

        try:
            response = await client.generate(model=model, prompt=prompt)
            print(f"OLLAMA RESPONSE OBJECT: {response}")
            return response["response"]
        except Exception as e:
            print(f"Error performing inference with Ollama: {e}")
            return {"error": str(e)}

    def whisper_audio_transcribe(self):
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model_path = "pengyizhou/whisper-fleurs-ceb_ph-small-tagalog-lid"
        
        pipe = pipeline(
            task="automatic-speech-recognition",
            model=model_path,
            chunk_length_s=30,
            device=device
        )
        
        recording_path = "src/recordings/123.mp3"
        result = pipe(recording_path, generate_kwargs={"language": "ceb"})
        print("TEXT TRANSCRIPT: ", result["text"])

        # model = WhisperModel(
        #     model_path,
        #     device="cpu",
        #     compute_type="int8",  # VERY important for your machine
        # )

        # recording_path = "src/recordings/123.mp3"
        # segments, _ = model.transcribe(
        #     recording_path,
        #     language=None,
        #     initial_prompt=(
        #         "Ang mosunod kay Cebuano nga panaghisgot. "
        #         "Gamita ang Cebuano isip pangunang pinulongan."
        #     ),
        # )

        # for segment in segments:
        #     print(segment.text)

    def write_text_to_pdf(self, raw_text: str, output_path: str = "output.pdf") -> str:
        """
        Converts raw text to a PDF and writes it to the filesystem.

        Args:
            raw_text (str): The text to be written to PDF.
            output_path (str): Path where the PDF will be saved.

        Returns:
            str: The full path to the saved PDF file.
        """

        pdf = canvas.Canvas(output_path, pagesize=LETTER)
        width, height = LETTER

        left_margin = 50
        top_margin = height - 50
        line_height = 14

        lines = raw_text.splitlines()
        y = top_margin

        for line in lines:
            if y < 50:  # Start a new page
                pdf.showPage()
                y = top_margin
            pdf.drawString(left_margin, y, line)
            y -= line_height

        pdf.save()
        return output_path

    async def upload_audio_to_external_service(
        self, audio_file_path: str, upload_url: str, filename: str = "audio.webm"
    ) -> dict:
        """
        Uploads an audio file to another FastAPI server service.

        Args:
            audio_file_path (str): Path to the local audio file to upload.
            upload_url (str): The full URL of the FastAPI endpoint to upload to.
            filename (str): The filename to set for the upload (default: "audio.webm").

        Returns:
            dict: Response from the external service.
        """
        try:
            async with httpx.AsyncClient() as client:
                with open(audio_file_path, "rb") as audio_file:
                    files = {"audio_file": (filename, audio_file, "audio/webm")}

                    response = await client.post(upload_url, files=files)
                    response.raise_for_status()
                    return response.json()
        except Exception as e:
            print(f"Error uploading audio to external service: {e}")
            return {"error": str(e)}
