export interface Meeting {
    id: number;
    title: string;
    start_timestamp: number;
    end_timestamp: number | null;
    duration_seconds: number;
    summary: string | null;
    is_pro: boolean;
    file_name: string | null;
    is_favorite: boolean;
}

export interface MeetingSegment {
    id: number;
    meeting_id: number;
    speaker_id: string;
    start_time_offset: number;
    end_time_offset: number;
    text: string;
}

export interface MeetingDetails {
    meeting: Meeting;
    segments: MeetingSegment[];
    audio_path: string | null;
}
