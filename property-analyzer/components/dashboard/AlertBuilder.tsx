"use client";

import { useState } from "react";
import { Bell, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { useWatchlistStore } from "@/lib/stores/watchlist-store";
import type { Alert } from "@/lib/stores/watchlist-store";

interface AlertBuilderProps {
  zip: string;
  marketName: string;
  onClose?: () => void;
}

const metricOptions: Array<{ value: Alert["metric"]; label: string }> = [
  { value: "hyperScore", label: "HyperScore" },
  { value: "capRate", label: "Cap Rate" },
  { value: "priceChange", label: "Price Change" },
  { value: "inventory", label: "Inventory" },
  { value: "signal", label: "Signal" },
];

const conditionOptions: Array<{ value: Alert["condition"]; label: string }> = [
  { value: "above", label: "Rises above" },
  { value: "below", label: "Drops below" },
  { value: "crosses", label: "Crosses" },
];

const defaultThresholds: Record<Alert["metric"], number> = {
  hyperScore: 70,
  capRate: 6.0,
  priceChange: 5.0,
  inventory: 100,
  signal: 50,
};

const thresholdHints: Record<Alert["metric"], string> = {
  hyperScore: "Score 0\u2013100. Higher is stronger.",
  capRate: "Percentage (e.g. 6.0 = 6%).",
  priceChange: "Year-over-year % change.",
  inventory: "Number of active listings.",
  signal: "Signal strength 0\u2013100.",
};

export default function AlertBuilder({ zip, marketName, onClose }: AlertBuilderProps) {
  const { addAlert } = useWatchlistStore();

  const [metric, setMetric] = useState<Alert["metric"]>("hyperScore");
  const [condition, setCondition] = useState<Alert["condition"]>("above");
  const [threshold, setThreshold] = useState<string>(
    String(defaultThresholds.hyperScore)
  );
  const [saved, setSaved] = useState(false);

  const handleMetricChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMetric = e.target.value as Alert["metric"];
    setMetric(newMetric);
    setThreshold(String(defaultThresholds[newMetric]));
    setSaved(false);
  };

  const handleConditionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCondition(e.target.value as Alert["condition"]);
    setSaved(false);
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setThreshold(e.target.value);
    setSaved(false);
  };

  const handleSave = () => {
    const numericThreshold = parseFloat(threshold);
    if (isNaN(numericThreshold)) return;

    addAlert({
      zip,
      marketName,
      metric,
      condition,
      threshold: numericThreshold,
      enabled: true,
    });

    setSaved(true);

    // Reset saved indicator after a brief moment
    setTimeout(() => setSaved(false), 2000);
  };

  const isValid = threshold !== "" && !isNaN(parseFloat(threshold));

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl animate-scale-in">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-gold-400" />
          <h3 className="text-sm font-semibold text-gray-300">
            New Alert
          </h3>
          <span className="text-[10px] text-gray-600 font-mono truncate max-w-[120px]">
            {marketName}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="h-6 w-6 rounded flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-surface-elevated transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Form */}
      <div className="p-5 space-y-4">
        {/* Row 1: Metric */}
        <Select
          id={`alert-metric-${zip}`}
          label="When"
          value={metric}
          onChange={handleMetricChange}
          options={metricOptions}
        />

        {/* Row 2: Condition */}
        <Select
          id={`alert-condition-${zip}`}
          label="Condition"
          value={condition}
          onChange={handleConditionChange}
          options={conditionOptions}
        />

        {/* Row 3: Threshold */}
        <Input
          id={`alert-threshold-${zip}`}
          label="Threshold"
          type="number"
          step="any"
          value={threshold}
          onChange={handleThresholdChange}
          hint={thresholdHints[metric]}
          error={
            threshold !== "" && isNaN(parseFloat(threshold))
              ? "Enter a valid number"
              : undefined
          }
        />

        {/* Row 4: Save */}
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={!isValid}
          className="w-full"
        >
          {saved ? "Alert Saved" : "Save Alert"}
        </Button>
      </div>
    </div>
  );
}
