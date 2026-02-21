import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ask } from "@tauri-apps/plugin-dialog";
import { ChevronDown, Globe, Search, Brain, Target, Zap } from "lucide-react";
import { ModelCard } from "@/components/onboarding/ModelCard";
import { useModelStore } from "@/stores/modelStore";
import { LANGUAGES } from "@/lib/constants/languages.ts";
import type { ModelInfo } from "@/bindings";

export const ModelsSettings: React.FC = () => {
  const { t } = useTranslation();
  const [switchingModelId, setSwitchingModelId] = useState<string | null>(null);
  const [languageFilter, setLanguageFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"transcription" | "speech">("transcription");

  const {
    models,
    currentModel,
    currentTtsModel,
    downloadingModels,
    downloadProgress,
    loading,
    downloadModel,
    selectModel,
    deleteModel,
  } = useModelStore();

  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      // Filter by tab
      const isTTS = model.engine_type === "Piper" || model.engine_type === "XTTS";
      if (activeTab === "transcription" && isTTS) return false;
      if (activeTab === "speech" && !isTTS) return false;

      const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLanguage = languageFilter === "all" ||
        (languageFilter === "multilingual" ? model.supported_languages.length > 1 : model.supported_languages.includes(languageFilter));

      return matchesSearch && matchesLanguage;
    });
  }, [models, searchQuery, languageFilter, activeTab]);

  const downloadedModels = filteredModels.filter(m => m.is_downloaded);
  const availableModels = filteredModels.filter(m => !m.is_downloaded);

  const handleModelSelect = async (modelId: string) => {
    setSwitchingModelId(modelId);
    try {
      await selectModel(modelId);
    } finally {
      setSwitchingModelId(null);
    }
  };

  const handleModelDelete = async (modelId: string) => {
    const model = models.find((m: ModelInfo) => m.id === modelId);
    const modelName = model?.name || modelId;
    const isActive = modelId === currentModel;

    const confirmed = await ask(
      isActive
        ? t("settings.models.deleteActiveConfirm", { modelName })
        : t("settings.models.deleteConfirm", { modelName }),
      {
        title: t("settings.models.deleteTitle"),
        kind: "warning",
      },
    );

    if (confirmed) {
      try {
        await deleteModel(modelId);
      } catch (err) {
        console.error(`Failed to delete model ${modelId}:`, err);
      }
    }
  };

  return (
    <div className="w-full space-y-10 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="mac-title text-3xl">AI Models</h1>
        <p className="mac-muted text-sm max-w-xl">
          Configure and download local AI models for transcription and high-quality speech.
        </p>
      </div>

      <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("transcription")}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "transcription" ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-muted hover:text-text hover:bg-white/5"}`}
        >
          Transcription
        </button>
        <button
          onClick={() => setActiveTab("speech")}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "speech" ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-text-muted hover:text-text hover:bg-white/5"}`}
        >
          Speech (TTS)
        </button>
      </div>

      <div className="flex items-center gap-4 border-b border-white/5 pb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search models..."
            className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-2xl py-3 pl-12 pr-4 text-[14px] text-black dark:text-text focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all placeholder:text-gray-500 dark:placeholder:text-text-muted/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative">
          <select
            className="appearance-none bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-2xl px-5 py-3 pr-10 text-[14px] font-medium text-black dark:text-text focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all cursor-pointer"
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
          >
            <option value="all">All Languages</option>
            <option value="en">English Only</option>
            <option value="multilingual">Multilingual</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={14} />
        </div>
      </div>

      <div className="space-y-12">
        {downloadedModels.length > 0 && (
          <div className="space-y-6">
            <h2 className="mac-section-header flex items-center gap-2">
              <Brain size={16} />
              Installed Models
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {downloadedModels.map((model) => {
                const isTTS = model.engine_type === "Piper" || model.engine_type === "XTTS";
                return (
                  <ModelCard
                    key={model.id}
                    model={model}
                    isActive={isTTS ? currentTtsModel === model.id : currentModel === model.id}
                    onSelect={handleModelSelect}
                    onDownload={downloadModel}
                    onDelete={handleModelDelete}
                  />
                );
              })}
            </div>
          </div>
        )}

        {availableModels.length > 0 && (
          <div className="space-y-6">
            <h2 className="mac-section-header flex items-center gap-2">
              <Globe size={16} />
              Available to Download
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80 hover:opacity-100 transition-opacity">
              {availableModels.map((model) => {
                const isTTS = model.engine_type === "Piper" || model.engine_type === "XTTS";
                return (
                  <ModelCard
                    key={model.id}
                    model={model}
                    isActive={isTTS ? currentTtsModel === model.id : currentModel === model.id}
                    onSelect={handleModelSelect}
                    onDownload={downloadModel}
                    onDelete={handleModelDelete}
                  />
                );
              })}
            </div>
          </div>
        )}

        {filteredModels.length === 0 && !loading && (
          <div className="mac-card flex flex-col items-center justify-center py-20 text-center bg-white/[0.02]">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Search size={32} className="text-text-muted opacity-20" />
            </div>
            <p className="mac-title text-xl mb-2">No models found</p>
            <p className="mac-muted text-sm mb-6">Try adjusting your search or filters.</p>
            <button
              onClick={() => { setSearchQuery(""); setLanguageFilter("all"); }}
              className="px-6 py-2.5 bg-accent text-white rounded-xl font-bold text-sm shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
