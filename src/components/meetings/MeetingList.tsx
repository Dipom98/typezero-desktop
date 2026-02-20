import React, { useState } from "react";
import { Meeting } from "@/types/meetingTypes";
import { Calendar, ChevronRight, Mic, ChevronLeft, ChevronRight as ChevronRightIcon, Star } from "lucide-react";

interface MeetingListProps {
    meetings: Meeting[];
    onSelectMeeting: (id: number) => void;
    onToggleFavorite: (id: number) => void;
}

const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export const MeetingList: React.FC<MeetingListProps> = ({ meetings, onSelectMeeting, onToggleFavorite }) => {
    const [viewMode, setViewMode] = useState<"recent" | "all" | "favorites">("recent");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filter meetings based on view mode (except for recent/all split)
    // Also filter out "Quick Dictation" entries as they belong in History only
    const validMeetings = meetings.filter(m => m.title !== "Quick Dictation");
    const favoriteMeetings = validMeetings.filter(m => m.is_favorite);

    // Recent: First 5 (of all or favorites? User likely wants recent OF ALL by default)
    // If viewMode is "favorites", show paginated favorites?

    let displayedMeetings: Meeting[] = [];
    let totalPages = 0;

    if (viewMode === "recent") {
        displayedMeetings = validMeetings.slice(0, 5);
        totalPages = 1;
    } else if (viewMode === "all") {
        totalPages = Math.ceil(validMeetings.length / itemsPerPage);
        displayedMeetings = validMeetings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    } else if (viewMode === "favorites") {
        totalPages = Math.ceil(favoriteMeetings.length / itemsPerPage);
        displayedMeetings = favoriteMeetings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Tabs / Header */}
            <div className="flex items-center justify-between px-2">
                <div className="flex gap-4">
                    <button
                        onClick={() => { setViewMode("recent"); setCurrentPage(1); }}
                        className={`text-sm font-bold uppercase tracking-widest transition-colors ${viewMode === "recent" ? "text-accent" : "text-text-muted opacity-60 hover:opacity-100"
                            }`}
                    >
                        Recent
                    </button>
                    <button
                        onClick={() => { setViewMode("favorites"); setCurrentPage(1); }}
                        className={`text-sm font-bold uppercase tracking-widest transition-colors ${viewMode === "favorites" ? "text-accent" : "text-text-muted opacity-60 hover:opacity-100"
                            }`}
                    >
                        Favorites
                    </button>
                    <button
                        onClick={() => { setViewMode("all"); setCurrentPage(1); }}
                        className={`text-sm font-bold uppercase tracking-widest transition-colors ${viewMode === "all" ? "text-accent" : "text-text-muted opacity-60 hover:opacity-100"
                            }`}
                    >
                        View All
                    </button>
                </div>
            </div>

            {/* List */}
            {displayedMeetings.length === 0 ? (
                <div className="mac-card p-12 flex flex-col items-center justify-center text-center space-y-4 border-dashed border-white/10 bg-transparent">
                    <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-text-muted opacity-20">
                        {viewMode === "favorites" ? <Star size={32} /> : <Mic size={32} />}
                    </div>
                    <div className="max-w-xs space-y-2">
                        <h3 className="text-lg font-bold">{viewMode === "favorites" ? "No favorites yet" : "No meetings found"}</h3>
                        <p className="text-sm text-text-muted leading-relaxed">
                            {viewMode === "favorites"
                                ? "Star your important meetings to see them here."
                                : viewMode === "recent"
                                    ? "Start recording to see recent meetings here."
                                    : "No meeting history available."}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {displayedMeetings.map((meeting) => (
                        <div
                            key={meeting.id}
                            className="mac-card p-4 flex items-center justify-between group hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                        >
                            <div
                                className="flex items-center gap-4 flex-1 cursor-pointer"
                                onClick={() => onSelectMeeting(meeting.id)}
                            >
                                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">{meeting.title}</h3>
                                    <p className="text-xs text-text-muted flex gap-2">
                                        <span>{formatDate(new Date(meeting.start_timestamp * 1000))}</span>
                                        <span>•</span>
                                        <span>{Math.floor(meeting.duration_seconds / 60)}m {meeting.duration_seconds % 60}s</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleFavorite(meeting.id);
                                    }}
                                    className={`p-2 rounded-full hover:bg-white/10 transition-colors ${meeting.is_favorite ? "text-yellow-400" : "text-text-muted opacity-0 group-hover:opacity-100"}`}
                                >
                                    <Star size={16} fill={meeting.is_favorite ? "currentColor" : "none"} />
                                </button>
                                <ChevronRight
                                    size={16}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted cursor-pointer"
                                    onClick={() => onSelectMeeting(meeting.id)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls (For 'all' and 'favorites') */}
            {(viewMode === "all" || viewMode === "favorites") && totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-white/5">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-bold text-text-muted">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRightIcon size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};
