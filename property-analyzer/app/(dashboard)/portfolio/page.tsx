"use client";

import { useState } from "react";
import {
  Building2,
  DollarSign,
  TrendingUp,
  Percent,
  MapPin,
  Plus,
  Trash2,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import MetricCard from "@/components/ui/MetricCard";
import Button from "@/components/ui/Button";
import SparklineChart from "@/components/charts/SparklineChart";
import CashFlowChart from "@/components/charts/CashFlowChart";
import { formatCurrency } from "@/lib/utils/format";

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  purchasePrice: number;
  currentValue: number;
  monthlyRent: number;
  monthlyExpenses: number;
  mortgage: number;
  capRate: number;
  cashOnCash: number;
  equity: number;
  appreciation: number;
  status: "performing" | "watch" | "underperforming";
  valueHistory: number[];
}

const sampleProperties: Property[] = [
  {
    id: "1", address: "1423 Cedar Ridge Dr", city: "Austin", state: "TX",
    purchasePrice: 285000, currentValue: 312000, monthlyRent: 2100,
    monthlyExpenses: 450, mortgage: 1180, capRate: 7.2, cashOnCash: 11.8,
    equity: 84000, appreciation: 9.5, status: "performing",
    valueHistory: [285, 288, 292, 295, 298, 301, 304, 306, 308, 310, 311, 312],
  },
  {
    id: "2", address: "782 Oakwood Blvd", city: "Nashville", state: "TN",
    purchasePrice: 225000, currentValue: 241000, monthlyRent: 1750,
    monthlyExpenses: 380, mortgage: 980, capRate: 6.5, cashOnCash: 9.4,
    equity: 61000, appreciation: 7.1, status: "performing",
    valueHistory: [225, 227, 229, 231, 233, 234, 236, 237, 238, 239, 240, 241],
  },
  {
    id: "3", address: "3901 Pine Valley Ct", city: "Tampa", state: "FL",
    purchasePrice: 198000, currentValue: 205000, monthlyRent: 1450,
    monthlyExpenses: 320, mortgage: 850, capRate: 5.8, cashOnCash: 7.1,
    equity: 47000, appreciation: 3.5, status: "watch",
    valueHistory: [198, 199, 200, 201, 200, 201, 202, 203, 203, 204, 204, 205],
  },
  {
    id: "4", address: "567 Magnolia St", city: "Raleigh", state: "NC",
    purchasePrice: 310000, currentValue: 298000, monthlyRent: 1900,
    monthlyExpenses: 480, mortgage: 1320, capRate: 4.2, cashOnCash: 2.8,
    equity: 50000, appreciation: -3.9, status: "underperforming",
    valueHistory: [310, 308, 306, 304, 303, 302, 301, 300, 299, 298, 298, 298],
  },
];

function statusVariant(status: Property["status"]) {
  if (status === "performing") return "success" as const;
  if (status === "watch") return "warning" as const;
  return "danger" as const;
}

export default function PortfolioPage() {
  const [properties] = useState<Property[]>(sampleProperties);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const totalValue = properties.reduce((s, p) => s + p.currentValue, 0);
  const totalEquity = properties.reduce((s, p) => s + p.equity, 0);
  const totalCashFlow = properties.reduce(
    (s, p) => s + (p.monthlyRent - p.monthlyExpenses - p.mortgage),
    0
  );
  const avgCapRate =
    properties.reduce((s, p) => s + p.capRate, 0) / properties.length;

  const cashFlowData = properties.map((p) => ({
    month: p.city,
    income: p.monthlyRent,
    mortgage: p.mortgage,
    expenses: p.monthlyExpenses,
    cashFlow: p.monthlyRent - p.monthlyExpenses - p.mortgage,
  }));

  const selected = properties.find((p) => p.id === selectedId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Portfolio</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track your investment properties and portfolio performance
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Value"
          value={formatCurrency(totalValue)}
          trend="up"
          trendValue="+5.8% YTD"
          color="green"
          icon={DollarSign}
        />
        <MetricCard
          label="Total Equity"
          value={formatCurrency(totalEquity)}
          trend="up"
          trendValue={`${properties.length} properties`}
          color="gold"
          icon={Briefcase}
        />
        <MetricCard
          label="Monthly Cash Flow"
          value={formatCurrency(totalCashFlow)}
          trend={totalCashFlow > 0 ? "up" : "down"}
          trendValue="Net after expenses"
          color={totalCashFlow > 0 ? "green" : "red"}
          icon={TrendingUp}
        />
        <MetricCard
          label="Avg Cap Rate"
          value={`${avgCapRate.toFixed(1)}%`}
          color="blue"
          icon={Percent}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card header="Portfolio Value (12 months)">
          <SparklineChart
            data={[810, 822, 835, 842, 848, 855, 862, 870, 878, 885, 892, 898]}
            height={200}
            color="#22c55e"
            showArea
          />
          <div className="flex items-center gap-2 mt-3">
            <ArrowUpRight className="h-4 w-4 text-money-400" />
            <span className="text-sm text-money-400 font-medium">
              +10.9% from 12mo ago
            </span>
          </div>
        </Card>
        <Card header="Cash Flow by Property">
          <CashFlowChart data={cashFlowData} />
        </Card>
      </div>

      {/* Property list */}
      <Card header={`Properties (${properties.length})`}>
        <div className="space-y-1">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-4">Property</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-right">Value</div>
            <div className="col-span-2 text-right">Cash Flow</div>
            <div className="col-span-1 text-right">Cap</div>
            <div className="col-span-2 text-right">Appreciation</div>
          </div>
          {properties.map((prop) => {
            const monthlyCF =
              prop.monthlyRent - prop.monthlyExpenses - prop.mortgage;
            return (
              <div
                key={prop.id}
                onClick={() =>
                  setSelectedId(selectedId === prop.id ? null : prop.id)
                }
                className={`grid grid-cols-12 gap-4 px-3 py-3 rounded-lg cursor-pointer transition-colors group ${
                  selectedId === prop.id
                    ? "bg-money-900/20 border border-money-800/40"
                    : "hover:bg-surface-elevated border border-transparent"
                }`}
              >
                <div className="col-span-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-surface-elevated group-hover:bg-surface-muted transition-colors">
                    <Building2 className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {prop.address}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {prop.city}, {prop.state}
                    </p>
                  </div>
                </div>
                <div className="col-span-1 flex justify-center items-center">
                  <Badge variant={statusVariant(prop.status)} size="sm">
                    {prop.status === "performing"
                      ? "Good"
                      : prop.status === "watch"
                      ? "Watch"
                      : "Low"}
                  </Badge>
                </div>
                <div className="col-span-2 flex items-center justify-end">
                  <span className="text-sm font-mono text-gray-300">
                    {formatCurrency(prop.currentValue)}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-end">
                  <span
                    className={`text-sm font-mono ${
                      monthlyCF >= 0 ? "text-money-400" : "text-red-400"
                    }`}
                  >
                    {monthlyCF >= 0 ? "+" : ""}
                    {formatCurrency(monthlyCF)}/mo
                  </span>
                </div>
                <div className="col-span-1 flex items-center justify-end">
                  <span
                    className={`text-sm font-mono ${
                      prop.capRate >= 6
                        ? "text-money-400"
                        : prop.capRate >= 4
                        ? "text-gold-400"
                        : "text-red-400"
                    }`}
                  >
                    {prop.capRate}%
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1">
                  {prop.appreciation >= 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-money-400" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                  )}
                  <span
                    className={`text-sm font-mono ${
                      prop.appreciation >= 0 ? "text-money-400" : "text-red-400"
                    }`}
                  >
                    {prop.appreciation >= 0 ? "+" : ""}
                    {prop.appreciation}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Expanded property detail */}
      {selected && (
        <Card
          header={`${selected.address} — ${selected.city}, ${selected.state}`}
        >
          <div className="space-y-6 animate-slide-up">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Purchase Price</p>
                <p className="text-lg font-bold text-gray-200 font-mono">
                  {formatCurrency(selected.purchasePrice)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Current Value</p>
                <p className="text-lg font-bold text-money-400 font-mono">
                  {formatCurrency(selected.currentValue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Equity</p>
                <p className="text-lg font-bold text-gold-400 font-mono">
                  {formatCurrency(selected.equity)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">CoC Return</p>
                <p className="text-lg font-bold text-blue-400 font-mono">
                  {selected.cashOnCash}%
                </p>
              </div>
            </div>

            {/* Value chart */}
            <div>
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-medium">
                Value History ($K)
              </p>
              <SparklineChart
                data={selected.valueHistory}
                height={120}
                color={
                  selected.appreciation >= 0 ? "#22c55e" : "#ef4444"
                }
                showArea
              />
            </div>

            {/* Monthly breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-surface-elevated rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Rent</p>
                <p className="text-sm font-mono text-money-400">
                  +{formatCurrency(selected.monthlyRent)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Mortgage</p>
                <p className="text-sm font-mono text-red-400">
                  -{formatCurrency(selected.mortgage)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Expenses</p>
                <p className="text-sm font-mono text-red-400">
                  -{formatCurrency(selected.monthlyExpenses)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Net Cash Flow</p>
                <p
                  className={`text-sm font-mono font-bold ${
                    selected.monthlyRent -
                      selected.monthlyExpenses -
                      selected.mortgage >=
                    0
                      ? "text-money-400"
                      : "text-red-400"
                  }`}
                >
                  {formatCurrency(
                    selected.monthlyRent -
                      selected.monthlyExpenses -
                      selected.mortgage
                  )}
                  /mo
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cap Rate</p>
                <p className="text-sm font-mono text-gold-400">
                  {selected.capRate}%
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" size="sm">
                <Eye className="h-3.5 w-3.5" />
                Full Analysis
              </Button>
              <Button variant="danger" size="sm">
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
