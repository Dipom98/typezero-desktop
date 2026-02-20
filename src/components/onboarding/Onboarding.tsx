import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import type { ModelInfo } from "@/bindings";
import type { ModelCardStatus } from "./ModelCard";
import ModelCard from "./ModelCard";
import TypeZeroTextLogo from "../icons/TypeZeroTextLogo";
import { useModelStore } from "../../stores/modelStore";

import logoTaglineUrl from "../../assets/logo-tagline.png";

interface OnboardingProps {
  onModelSelected: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onModelSelected }) => {
  const { t } = useTranslation();
  const {
    models,
    downloadModel,
    selectModel,
    downloadingModels,
    extractingModels,
    downloadProgress,
    downloadStats,
  } = useModelStore();
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const isDownloading = selectedModelId !== null;

  // Watch for the selected model to finish downloading + extracting
  useEffect(() => {
    if (!selectedModelId) return;

    const model = models.find((m) => m.id === selectedModelId);
    const stillDownloading = selectedModelId in downloadingModels;
    const stillExtracting = selectedModelId in extractingModels;

    if (model?.is_downloaded && !stillDownloading && !stillExtracting) {
      // Model is ready — select it and transition
      selectModel(selectedModelId).then((success) => {
        if (success) {
          onModelSelected();
        } else {
          toast.error(t("onboarding.errors.selectModel"));
          setSelectedModelId(null);
        }
      });
    }
  }, [
    selectedModelId,
    models,
    downloadingModels,
    extractingModels,
    selectModel,
    onModelSelected,
  ]);

  const handleDownloadModel = async (modelId: string) => {
    setSelectedModelId(modelId);

    const success = await downloadModel(modelId);
    if (!success) {
      toast.error(t("onboarding.downloadFailed"));
      setSelectedModelId(null);
    }
  };

  const getModelStatus = (modelId: string): ModelCardStatus => {
    if (modelId in extractingModels) return "extracting";
    if (modelId in downloadingModels) return "downloading";
    return "downloadable";
  };

  const getModelDownloadProgress = (modelId: string): number | undefined => {
    return downloadProgress[modelId]?.percentage;
  };

  const getModelDownloadSpeed = (modelId: string): number | undefined => {
    return downloadStats[modelId]?.speed;
  };

  const notDownloadedCount = models.filter((m: ModelInfo) => !m.is_downloaded).length;
  const alreadyHasModel = models.some((m: ModelInfo) => m.is_downloaded);

  return (
    <div className="flex flex-col h-full max-w-xl mx-auto py-6 animate-in slide-in-from-right-8 duration-500 gap-4">
      <div className="flex flex-col items-center gap-2 shrink-0">
        <img src={logoTaglineUrl} alt="TypeZero" width={520} className="object-contain" />
        <p className="text-text/70 max-w-md font-medium mx-auto text-center">
          {t("onboarding.subtitle")}
        </p>
      </div>

      <div className="max-w-[600px] w-full mx-auto text-center flex-1 flex flex-col min-h-0">
        <div className="flex flex-col gap-4 pb-4">
          {models
            .filter((m: ModelInfo) => !m.is_downloaded)
            .filter((model: ModelInfo) => model.is_recommended)
            .map((model: ModelInfo) => (
              <ModelCard
                key={model.id}
                model={model}
                isActive={selectedModelId === model.id}
                onSelect={() => handleDownloadModel(model.id)}
                onDownload={() => handleDownloadModel(model.id)}
                onDelete={() => { }} // No delete in onboarding
              />
            ))}

          {models
            .filter((m: ModelInfo) => !m.is_downloaded)
            .filter((model: ModelInfo) => !model.is_recommended)
            .sort(
              (a: ModelInfo, b: ModelInfo) =>
                Number(a.size_mb) - Number(b.size_mb),
            )
            .map((model: ModelInfo) => (
              <ModelCard
                key={model.id}
                model={model}
                isActive={selectedModelId === model.id}
                onSelect={() => handleDownloadModel(model.id)}
                onDownload={() => handleDownloadModel(model.id)}
                onDelete={() => { }} // No delete in onboarding
              />
            ))}

          {/* Show hint if models are already downloaded */}
          {notDownloadedCount === 0 && alreadyHasModel && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-sm font-semibold text-emerald-700 mb-1">✓ Model already downloaded</p>
              <p className="text-xs text-gray-500">You already have a model on this device. Click Skip to continue.</p>
            </div>
          )}
        </div>

        {/* Skip button — always visible for users who reinstalled or already have models */}
        {!isDownloading && (
          <div className="mt-4 mb-4 flex flex-col items-center gap-2">
            <button
              onClick={onModelSelected}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:border-gray-300 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
            >
              {alreadyHasModel ? "I already have a model — Skip" : "Skip for now"}
              <ArrowRight size={16} />
            </button>
            {alreadyHasModel && (
              <p className="text-xs text-gray-400">
                Your previously downloaded model will be detected automatically.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
