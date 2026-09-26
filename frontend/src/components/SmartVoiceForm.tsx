import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Check, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || '';

interface SmartVoiceFormProps {
  title: string;
  description: string;
  endpoint: string; // the fastapi endpoint to hit with the transcript
  onDataExtracted: (data: any) => void;
  lang?: string;
}

export function SmartVoiceForm({ title, description, endpoint, onDataExtracted, lang = "en-IN" }: SmartVoiceFormProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  const handleVoiceToggle = () => {
    if (recording && mediaRecorder) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => processAudio(new Blob(chunks, { type: "audio/webm" }));

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      toast({ title: "Listening...", description: "Speak your details clearly." });
    } catch (err) {
      toast({ title: "Microphone Access Denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    setRecording(false);
    setProcessing(true);
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", new File([audioBlob], "recording.webm", { type: "audio/webm" }));
      formData.append("language_code", lang);
      
      const response = await fetch(`${API_URL}/api/voice/process`, {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      if (data.status === "success") {
        toast({ title: "Voice Processed!", description: "Extracted your details successfully.", variant: "default" });
        onDataExtracted(data.identified_fields);
      } else {
        toast({ title: "Failed to process", description: data.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Connection Error", description: "Make sure backend is accessible", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="w-full shadow-lg border-2 border-emerald-100 hover:border-emerald-300 transition-all">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          {title} 
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-6">
          <Button 
            onClick={handleVoiceToggle} 
            disabled={processing}
            size="lg"
            className={`w-32 h-32 rounded-full flex flex-col gap-2 ${recording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-emerald-500 hover:bg-emerald-600'}`}
          >
            {recording ? <MicOff size={48} /> : <Mic size={48} />}
          </Button>
          <p className="mt-4 font-semibold text-lg text-emerald-800">
            {recording ? "Speak now..." : processing ? "Processing audio..." : "Tap to Speak"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
