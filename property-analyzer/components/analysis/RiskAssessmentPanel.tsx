"use client";

import {
  Shield,
  TrendingDown,
  CloudRain,
  Landmark,
  DollarSign,
  Building2,
  Users,
} from "lucide-react";
import Card from "@/components/ui/Card";
import RiskRadarChart from "@/components/charts/RiskRadarChart";

interface RiskDimension {
  name: string;
  score: number;
  level: "low" | "medium" | "high";
  description: string;
}

interface RiskAssessmentPanelProps {
  overallScore: number;
  dimensions: RiskDimension[];
}

const dimensionIcons: Record<string, typeof Shield> = {
  Market: TrendingDown,
  Financial: DollarSign,
  Climate: CloudRain,
  Regulatory: Landmark,
  Property: Building2,
  Demographic: Users,
  Economic: Shield,
};

function levelColor(level: "low" | "medium" | "high") {
  if (level === "low") return "text-money-400 bg-money-900/30";
  if (level === "medium") return "text-gold-400 bg-gold-900/30";
  return "text-red-400 bg-red-900/30";
}

function levelLabel(level: "low" | "medium" | "high") {
  if (level === "low") return "Low Risk";
  if (level === "medium") return "Medium Risk";
  return "High Risk";
}

export default function RiskAssessmentPanel({
  overallScore,
  dimensions,
}: RiskAssessmentPanelProps) {
  const radarData = dimensions.map((d) => ({
    dimension: d.name,
    score: d.score,
    fullMark: 100,
  }));

  const overallLevel = overallScore >= 70 ? "low" : overallScore >= 40 ? "medium" : "high";

  return (
    <div className="space-y-6">
      {/* Overall + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="text-center py-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
              Overall Risk Score
            </p>
            <div className={`inline-flex items-center justify-center h-24 w-24 rounded-full border-4 ${
              overallLevel === "low" ? "border-money-500" : overallLevel === "medium" ? "border-gold-500" : "border-red-500"
            }`}>
              <span className={`text-3xl font-bold font-mono ${
                overallLevel === "low" ? "text-money-400" : overallLevel === "medium" ? "text-gold-400" : "text-red-400"
              }`}>
                {overallScore}
              </span>
            </div>
            <p className={`mt-3 text-sm font-medium ${
              overallLevel === "low" ? "text-money-400" : overallLevel === "medium" ? "text-gold-400" : "text-red-400"
            }`}>
              {levelLabel(overallLevel)}
            </p>
          </div>
        </Card>
        <Card header="Risk Dimensions">
          <RiskRadarChart data={radarData} />
        </Card>
      </div>

      {/* Dimension breakdown */}
      <Card header="Dimension Breakdown">
        <div className="space-y-3">
          {dimensions.map((dim) => {
            const Icon = dimensionIcons[dim.name] || Shield;
            return (
              <div
                key={dim.name}
                className="flex items-center gap-4 p-3 rounded-lg bg-surface-elevated"
              >
                <div className={`p-2 rounded-lg ${levelColor(dim.level)}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-200">
                      {dim.name}
                    </span>
                    <span className={`text-sm font-mono font-semibold ${
                      dim.level === "low" ? "text-money-400" : dim.level === "medium" ? "text-gold-400" : "text-red-400"
                    }`}>
                      {dim.score}/100
                    </span>
                  </div>
                  <div className="w-full bg-surface-muted rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        dim.level === "low" ? "bg-money-500" : dim.level === "medium" ? "bg-gold-500" : "bg-red-500"
                      }`}
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{dim.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
