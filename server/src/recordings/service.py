import ollama


client = ollama.AsyncClient(host="http://10.0.0.50:11434")

class RecordingService:
    """
    Service class encapsulating the logic for processing, converting, uploading,
    and persisting recordings.
    """

    async def summarize_with_ollama_qwen(self, audio_file_path, model="qwen2.5:14b"):
        """
        Performs inference using an Ollama model (e.g., summarization with Qwen).

        Args:
            audio_file_path: str -- path to the audio file (wav/m4a)
            model: str -- Ollama model name (default: "whisper")

        Returns:
            dict: result of inference (e.g., transcript or prediction)
        """
        
        transcripted_meeting_text="""
        Maayong buntag team. Mag-start ta sa atong dev meeting karon. Una, quick recap sa nahitabo gahapon. Overall okay ra ang progress, pero naa gihapon pipila ka areas nga kinahanglan pa nato tutukan.

Sa backend update, nahuman na nako ang core authentication flow gamit JWT. Working na ang login ug refresh token, ug naka-test na pud ko gamit Postman ug frontend requests. Naa lang gihapon edge case kung mag-expire ang token samtang naa pay ongoing request, so i-handle pa nako ang proper error response para clean ang behavior sa frontend. Ang role-based access control partially implemented na, admin ug regular user roles working na, sunod ana ang fine-grained permissions per feature.

Sa database side, gi-refactor nako ang pipila ka queries kay medyo slow na siya kung daghan data. Gi-add na nako ang basic indexes, ug nakita na dayon ang improvement sa response time. Wala pa ta kaabot sa full optimization, pero at least usable na siya for initial release. Naa pa plan nga mag-add ug soft deletes ug audit logs para mas klaro ang tracking sa changes sa future.

Sa frontend update, naa progress sa dashboard ug meeting list. Na-display na ang meetings gikan sa API, ug naa na pud basic empty states kung walay data. Ang issue lang karon kay kung slow ang network, murag walay klaro nga feedback sa user, so kinahanglan pa nato i-improve ang loading indicators ug error messages. Ang audio playback working na, pero naa gamay delay before mo-start ang sound, possibly tungod sa buffering. I-check pa nato kung kinahanglan ba i-preload ang audio or i-adjust ang settings.

Sa AI ug summarization feature, gi-test namo ang full flow gikan recording hangtod summary. Ang transcription accurate ra for most cases, pero kung daghan kaayo magstorya or naa background noise, mo-degrade ang quality. Ang summary sometimes too short, sometimes too generic, so gi-propose nga mag-add ta ug structured prompt, like bullet points for decisions, action items, ug key topics. Pwede pud ta mo-store sa raw transcript para mahimo pa ug re-summarize later kung kinahanglan.

Sa infrastructure side, gi-discuss namo ang deployment. For now, okay ra ta sa single instance, pero kinahanglan nato i-plan ang scaling. Suggestion nga mag-introduce Redis for caching ug job queue para sa AI processing, para dili heavy ang main API. Also, kinahanglan nato i-set up proper logging ug monitoring para dali ra ma-detect ang issues in production.

Sa blockers ug risks, ang pinaka-dako kay performance ug cost sa AI calls kung mo-daghan na ang users. Kailangan nato magbutang ug limits ug maybe usage-based controls. Wala man pud critical blockers karon, pero kinahanglan lang klaro ang priorities.

For today’s tasks, backend mo-focus sa token edge cases ug permission checks. Frontend mo-improve sa loading, error states, ug audio playback UX. AI side mo-refine sa prompts ug mo-test sa lain-lain nga meeting scenarios. Infrastructure mo-start sa Redis setup ug basic monitoring.

Mao ra to for now. Kung naa mo questions, suggestions, o concerns, pwede na ta mag-discuss karon before ta mo-proceed sa tasks.
        """
        
        with open("src/prompts/summarize_prompt.md", "r", encoding="utf-8") as f:
            template = f.read()
            
        prompt = template.replace("{{RAW_MEETING_TEXT}}", transcripted_meeting_text)
        print(f"prompt: {prompt}")
            
        try:
            response = await client.generate(
                model=model,
                prompt=prompt
            )
            print(response["response"])
            return response
        except Exception as e:
            print(f"Error performing inference with Ollama: {e}")
            return {"error": str(e)}






