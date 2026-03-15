"use client";

import { useState } from "react";
import { ArrowUpDown, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

interface Comp {
  address: string;
  price: number;
  sqft: number;
  pricePerSqft: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  daysOnMarket?: number;
  saleDate?: string;
  distance?: number;
  adjustedPrice?: number;
  similarity?: number;
}

interface CompsTableProps {
  comps: Comp[];
  subjectPrice?: number;
}

type SortKey = "price" | "pricePerSqft" | "sqft" | "daysOnMarket" | "similarity" | "distance";

export default function CompsTable({ comps, subjectPrice }: CompsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("similarity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...comps].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    return sortDir === "desc" ? Number(bVal) - Number(aVal) : Number(aVal) - Number(bVal);
  });

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`inline-flex items-center gap-1 hover:text-gray-300 ${
        sortKey === field ? "text-money-400" : ""
      }`}
    >
      {label} <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-surface-border">
            <th className="py-3 px-3 text-left">Property</th>
            <th className="py-3 px-3 text-right">
              <SortHeader label="Price" field="price" />
            </th>
            <th className="py-3 px-3 text-right">
              <SortHeader label="$/SqFt" field="pricePerSqft" />
            </th>
            <th className="py-3 px-3 text-right">
              <SortHeader label="SqFt" field="sqft" />
            </th>
            <th className="py-3 px-3 text-right">
              <SortHeader label="DOM" field="daysOnMarket" />
            </th>
            <th className="py-3 px-3 text-right">
              <SortHeader label="Dist" field="distance" />
            </th>
            <th className="py-3 px-3 text-right">
              <SortHeader label="Match" field="similarity" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {sorted.map((comp, i) => {
            const priceDiff = subjectPrice ? ((comp.price - subjectPrice) / subjectPrice) * 100 : 0;
            return (
              <tr
                key={i}
                className="hover:bg-surface-elevated transition-colors"
              >
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
                    <div>
                      <p className="text-gray-300 truncate max-w-[200px]">
                        {comp.address}
                      </p>
                      <p className="text-[10px] text-gray-600">
                        {comp.bedrooms}bd/{comp.bathrooms}ba &middot; Built {comp.yearBuilt}
                        {comp.saleDate && ` &middot; Sold ${comp.saleDate}`}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="font-mono text-gray-300">
                    {formatCurrency(comp.price)}
                  </span>
                  {subjectPrice && (
                    <span
                      className={`block text-[10px] font-mono ${
                        priceDiff > 0 ? "text-red-400" : "text-money-400"
                      }`}
                    >
                      {priceDiff > 0 ? "+" : ""}
                      {priceDiff.toFixed(1)}%
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-right font-mono text-gray-300">
                  ${comp.pricePerSqft}
                </td>
                <td className="py-3 px-3 text-right font-mono text-gray-400">
                  {comp.sqft.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right font-mono text-gray-400">
                  {comp.daysOnMarket ?? "—"}
                </td>
                <td className="py-3 px-3 text-right font-mono text-gray-400">
                  {comp.distance ? `${comp.distance} mi` : "—"}
                </td>
                <td className="py-3 px-3 text-right">
                  {comp.similarity != null ? (
                    <span
                      className={`font-mono font-medium ${
                        comp.similarity >= 80
                          ? "text-money-400"
                          : comp.similarity >= 60
                          ? "text-gold-400"
                          : "text-gray-400"
                      }`}
                    >
                      {comp.similarity}%
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
