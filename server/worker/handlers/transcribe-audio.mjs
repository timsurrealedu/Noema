import {failJob,finishJob} from "../../jobs.mjs";
import {finishTranscription,transcribeAudioFile} from "../../transcribe.mjs";
import {assetPath} from "../../objects.mjs";

// Lecture transcription (S2): long recordings are chunked server-side so the
// 10 MB inline caps never truncate a lecture; Gemini -> Groq Whisper ->
// local whisper.cpp chain per chunk.
export async function handleTranscribeAudio({job,config,db}){
  try{
    const asset=db.prepare("SELECT a.* FROM audio_transcripts t JOIN assets a ON a.id=t.asset_id WHERE t.capture_id=?").get(job.input.captureId);
    if(!asset)throw new Error("Audio asset not found for capture");
    const result=await transcribeAudioFile(assetPath(asset.sha256,config),asset.mime,config);
    finishTranscription(job.input.captureId,{...result,assetId:asset.id},db);
    const transcript=db.prepare("SELECT id FROM audio_transcripts WHERE capture_id=?").get(job.input.captureId);
    finishJob(job.id,{transcriptId:transcript?.id,provider:result.provider,model:result.model},db);
  }catch(error){db.prepare("UPDATE audio_transcripts SET state='failed',error=?,updated_at=? WHERE capture_id=?").run(String(error).slice(0,1000),new Date().toISOString(),job.input.captureId);failJob(job.id,error,db)}
}
