import React, { useState, useEffect, useRef } from "react";
import {
    Users,
    Plus,
    Clock,
    ChevronRight,
    Volume2,
    StopCircle
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { commands } from "@/bindings";
import { MeetingSegment, Meeting } from "@/types/meetingTypes";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import { MeetingList } from "./MeetingList";
import { MeetingDetail } from "./MeetingDetail";

export const MeetingScreen: React.FC = () => {
    const { t } = useTranslation();
    const [isRecording, setIsRecording] = useState(false);
    const [segments, setSegments] = useState<MeetingSegment[]>([]);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [meetingId, setMeetingId] = useState<number | null>(null);
    const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchMeetings = async () => {
        try {
            const res = await commands.getMeetings();
            if (res.status === "ok") {
                setMeetings(res.data as Meeting[]);
            }
        } catch (e) {
            console.error("Failed to fetch meetings:", e);
        }
    };

    useEffect(() => {
        fetchMeetings();

        // Listen for live segments
        const unlistenSegment = listen<MeetingSegment>("meeting-segment-added", (event) => {
            setSegments(prev => [...prev, event.payload]);
            // Auto-scroll
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        });

        // Check if a meeting is already active on mount
        commands.isMeetingActive().then((res) => {
            if (res.status === "ok") {
                setIsRecording(res.data);
            }
        });

        const unlistenStopped = listen<number>("meeting-stopped", () => {
            setIsRecording(false);
            setMeetingId(null);
            toast.success("Meeting saved to history");
            fetchMeetings(); // Refresh list
        });

        return () => {
            unlistenSegment.then(u => u());
            unlistenStopped.then(u => u());
        };
    }, []);

    const handleStartMeeting = async () => {
        try {
            const res = await commands.startMeeting(null, false);
            if (res.status === "ok") {
                setMeetingId(res.data);
                setIsRecording(true);
                setSegments([]);
                toast.info("Meeting recording started");
            } else {
                toast.error("Failed to start meeting: " + res.error);
            }
        } catch (error) {
            toast.error("An unexpected error occurred: " + error);
        }
    };

    const handleStopMeeting = async () => {
        try {
            const res = await commands.stopMeeting();
            if (res.status === "ok") {
                setIsRecording(false);
            } else {
                toast.error("Failed to stop meeting: " + res.error);
            }
        } catch (error) {
            toast.error("An unexpected error occurred: " + error);
        }
    };

    const handleToggleFavorite = async (id: number) => {
        try {
            const res = await commands.toggleMeetingFavorite(id);
            if (res.status === "ok") {
                toast.success("Updated favorite status");
                fetchMeetings();
            } else {
                toast.error("Failed to update favorite status: " + res.error);
            }
        } catch (error) {
            toast.error("An unexpected error occurred: " + error);
        }
    };

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-text to-text/60 bg-clip-text text-transparent">
                        Meetings
                    </h1>
                    <p className="text-text-muted mt-1 font-medium">Capture and transcribe your conversations.</p>
                </div>
                {!isRecording ? (
                    <button
                        onClick={handleStartMeeting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl font-bold shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-mac"
                    >
                        <Plus size={18} />
                        <span>New Meeting</span>
                    </button>
                ) : (
                    <button
                        onClick={handleStopMeeting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-mac"
                    >
                        <StopCircle size={18} />
                        <span>Stop Meeting</span>
                    </button>
                )}
            </div>

            {/* Recording View or Dashboard */}
            {isRecording ? (
                <div className="flex-1 min-h-0 flex flex-col gap-4">
                    <div className="mac-card flex-1 min-h-0 flex flex-col p-6 animate-in zoom-in-95 duration-500">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                    <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
                                </div>
                                <span className="font-bold tracking-tight text-red-500 uppercase text-xs">Recording Live</span>
                            </div>
                        </div>

                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-white/10"
                        >
                            {segments.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                    <Volume2 size={32} className="mb-2 animate-bounce" />
                                    <p className="text-sm font-medium italic">Listening for speech...</p>
                                </div>
                            )}
                            {segments.map((segment, i) => (
                                <div key={i} className="flex gap-4 animate-in slide-in-from-left-2 duration-300">
                                    <div className="shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                                        {segment.speaker_id === "Speaker 1" ? "S1" : "S2"}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold opacity-60 uppercase tracking-wider">{segment.speaker_id}</span>
                                            <span className="text-[10px] opacity-30 font-medium">Segment {i + 1}</span>
                                        </div>
                                        <p className="text-sm leading-relaxed text-text/90">{segment.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : selectedMeetingId ? (
                <MeetingDetail
                    meetingId={selectedMeetingId}
                    onBack={() => setSelectedMeetingId(null)}
                />
            ) : (
                <>
                    {/* Stats/Quick Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                        {[
                            { label: "Total Meetings", value: meetings.length.toString(), icon: Users, color: "text-blue-500" },
                            { label: "Transcribed Hours", value: "0h", icon: Clock, color: "text-emerald-500" },
                            { label: "Action Items", value: "0", icon: ChevronRight, color: "text-purple-500" },
                        ].map((stat, i) => (
                            <div key={i} className="mac-card p-4 flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl bg-white/5 ${stat.color}`}>
                                    <stat.icon size={20} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{stat.label}</p>
                                    <p className="text-xl font-bold">{stat.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main Content Areas */}
                    <MeetingList
                        meetings={meetings}
                        onSelectMeeting={setSelectedMeetingId}
                        onToggleFavorite={handleToggleFavorite}
                    />
                </>
            )}
        </div>
    );
};

export default MeetingScreen;
