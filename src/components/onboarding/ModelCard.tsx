import React from "react";
import {
  Check,
  Download,
  Trash2,
  Target,
  Zap,
  Cpu,
  Globe,
  Loader2
} from "lucide-react";
import { type ModelInfo } from "@/bindings";
import { useModelStore } from "../../stores/modelStore";

export type ModelCardStatus = "extracting" | "downloading" | "downloadable";

interface ModelCardProps {
  model: ModelInfo;
  isActive: boolean;
  onSelect: (modelId: string) => void;
  onDownload: (modelId: string) => void;
  onDelete: (modelId: string) => void;
  onCancel?: (modelId: string) => void;
}

export const ModelCard: React.FC<ModelCardProps> = ({
  model,
  isActive,
  onSelect,
  onDownload,
  onDelete,
}) => {
  const { isModelDownloading, getDownloadProgress, isModelExtracting } = useModelStore();

  const isDownloading = isModelDownloading(model.id);
  const isExtracting = isModelExtracting(model.id);
  const progress = getDownloadProgress(model.id);

  const getAccuracyLabel = (score: number) => {
    if (score >= 0.9) return { text: "Studio Grade", color: "text-emerald-500 bg-emerald-500/10" };
    if (score >= 0.7) return { text: "High Accuracy", color: "text-blue-500 bg-blue-500/10" };
    return { text: "Standard", color: "text-amber-500 bg-amber-500/10" };
  };

  const getSpeedLabel = (score: number) => {
    if (score >= 20) return { text: "Ultra Fast", color: "text-purple-500 bg-purple-500/10" };
    if (score >= 10) return { text: "Fast", color: "text-indigo-500 bg-indigo-500/10" };
    return { text: "Balanced", color: "text-slate-500 bg-slate-500/10" };
  };

  const accuracy = getAccuracyLabel(model.accuracy_score);
  const speed = getSpeedLabel(model.speed_score);

  return (
    <div
      className={`group relative overflow-hidden mac-card p-5 transition-all duration-300 ${isActive
        ? "border-accent/40 bg-accent/5 ring-1 ring-accent/20"
        : "hover:border-black/5 dark:hover:border-white/20 hover:bg-black/5 dark:hover:bg-white/[0.04]"
        }`}
    >
      {/* Active State Indicator */}
      {isActive && (
        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/20 animate-in zoom-in duration-300">
          <Check size={14} className="text-white" />
        </div>
      )}

      {/* Model Header */}
      <div className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold tracking-tight group-hover:text-accent transition-colors">
            {model.name}
          </h3>
          <p className="mac-muted text-[13px] leading-snug line-clamp-2">
            {model.description}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider ${accuracy.color}`}>
            <Target size={12} />
            {accuracy.text}
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider ${speed.color}`}>
            <Zap size={12} />
            {speed.text}
          </div>
        </div>

        {/* Model Meta */}
        <div className="flex items-center gap-4 text-[12px] mac-muted border-t border-black/5 dark:border-white/5 pt-4 mt-1">
          <div className="flex items-center gap-1.5">
            <Cpu size={14} className="opacity-60" />
            <span>{(model.size_mb / 1024).toFixed(1)}GB RAM</span>
          </div>
          {model.supported_languages.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/5">
              <Globe size={12} />
              <span>Multi-lang</span>
            </div>
          )}
        </div>

        {/* Action Button Area */}
        <div className="pt-2">
          {model.is_downloaded ? (
            <div className="flex gap-2">
              <button
                onClick={() => onSelect(model.id)}
                disabled={isActive}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] transition-all ${isActive
                  ? "bg-black/5 dark:bg-white/5 text-text-muted cursor-default"
                  : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-accent text-text dark:text-text hover:text-black dark:hover:text-white"
                  }`}
              >
                {isActive ? "Selected" : "Select Model"}
              </button>
              <button
                onClick={() => onDelete(model.id)}
                className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 text-text-muted hover:bg-red-500/10 hover:text-red-500 transition-all"
                title="Delete Model"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : isDownloading || isExtracting ? (
            <div className="space-y-3 p-1">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-accent">
                <span className="flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  {isExtracting ? "Extracting..." : "Downloading..."}
                </span>
                <span>{progress?.percentage.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300 ease-out"
                  style={{ width: `${progress?.percentage || 0}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={() => onDownload(model.id)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-accent/10 text-accent hover:bg-accent hover:text-white rounded-xl font-bold text-[13px] transition-all group/btn"
            >
              <Download size={16} className="group-hover/btn:translate-y-0.5 transition-transform" />
              Download Model
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelCard;
