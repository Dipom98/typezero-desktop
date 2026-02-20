import React, { useEffect, useState } from "react";
import { ArrowLeft, Calendar, Clock, Download, FileAudio, Volume2 } from "lucide-react";
import { commands } from "@/bindings";
import { MeetingDetails } from "@/types/meetingTypes";
import { convertFileSrc } from "@tauri-apps/api/core";
import { toast } from "sonner";

interface MeetingDetailProps {
    meetingId: number;
    onBack: () => void;
}

const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

export const MeetingDetail: React.FC<MeetingDetailProps> = ({ meetingId, onBack }) => {
    const [details, setDetails] = useState<MeetingDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [audioSrc, setAudioSrc] = useState<string | null>(null);

    useEffect(() => {
        const loadDetails = async () => {
            try {
                setLoading(true);
                // Cast commands to any to bypass missing binding type
                const res = await (commands as any).getMeetingDetails(meetingId);
                if (res.status === "ok") {
                    setDetails(res.data);
                    if (res.data.audio_path) {
                        setAudioSrc(convertFileSrc(res.data.audio_path));
                    }
                } else {
                    toast.error("Failed to load meeting details");
                }
            } catch (e) {
                console.error(e);
                toast.error("Error loading meeting details");
            } finally {
                setLoading(false);
            }
        };
        loadDetails();
    }, [meetingId]);

    const handleCopyTranscript = () => {
        if (!details) return;
        const text = details.segments.map(s => `${s.speaker_id}: ${s.text}`).join("\n\n");
        navigator.clipboard.writeText(text);
        toast.success("Transcript copied to clipboard");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
        );
    }

    if (!details) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <p className="text-text-muted">Meeting not found.</p>
                <button onClick={onBack} className="text-accent hover:underline">Go Back</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-6 animate-in slide-in-from-right-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 shrink-0">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold">{details.meeting.title}</h1>
                    <div className="flex items-center gap-3 text-sm text-text-muted mt-1">
                        <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDate(new Date(details.meeting.start_timestamp * 1000))}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {Math.floor(details.meeting.duration_seconds / 60)}m {details.meeting.duration_seconds % 60}s
                        </span>
                    </div>
                </div>
            </div>

            {/* Audio Player */}
            {audioSrc ? (
                <div className="mac-card p-4 bg-white/5 border-white/10 flex items-center gap-4 shrink-0">
                    <div className="p-3 rounded-full bg-accent/20 text-accent">
                        <FileAudio size={24} />
                    </div>
                    <div className="flex-1">
                        <audio controls src={audioSrc} className="w-full h-8" />
                    </div>
                </div>
            ) : (
                <div className="mac-card p-3 bg-white/5 border-white/10 flex items-center gap-3 shrink-0 opacity-60">
                    <Volume2 size={16} />
                    <span className="text-xs text-text-muted">Audio not available for this meeting</span>
                </div>
            )}

            {/* Transcript */}
            <div className="flex-1 min-h-0 flex flex-col mac-card p-0 overflow-hidden bg-white/5 border-white/10">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <h3 className="font-bold">Transcript</h3>
                    <button
                        onClick={handleCopyTranscript}
                        className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                    >
                        <Download size={14} />
                        Copy Text
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {details.segments.length === 0 ? (
                        <p className="text-center text-text-muted italic opacity-50">No transcript available.</p>
                    ) : (
                        details.segments.map((segment, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-text-muted">
                                    {segment.speaker_id === "Speaker 1" ? "S1" : "S2"}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold opacity-60 uppercase tracking-wider">{segment.speaker_id}</span>
                                        <span className="text-[10px] opacity-30 font-medium">{formatDuration(Math.floor(segment.start_time_offset))}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed text-text/90">{segment.text}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
