"use client";

import { useState } from "react";
import {
  Settings,
  Key,
  Bell,
  Palette,
  Shield,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Tabs from "@/components/ui/Tabs";

interface ApiKeyConfig {
  name: string;
  envVar: string;
  configured: boolean;
  priority: "P0" | "P1" | "P2";
  description: string;
  docsUrl: string;
}

const apiKeys: ApiKeyConfig[] = [
  { name: "ATTOM", envVar: "ATTOM_API_KEY", configured: false, priority: "P0", description: "Property data, valuations, and transactions", docsUrl: "https://api.gateway.attomdata.com/propertyapi/v1.0.0" },
  { name: "RentCast", envVar: "RENTCAST_API_KEY", configured: false, priority: "P0", description: "Rental estimates and comparables", docsUrl: "https://developers.rentcast.io/reference" },
  { name: "Census ACS", envVar: "CENSUS_API_KEY", configured: false, priority: "P0", description: "Demographics, income, population data", docsUrl: "https://api.census.gov/data.html" },
  { name: "FRED", envVar: "FRED_API_KEY", configured: false, priority: "P1", description: "Federal Reserve economic data (rates, CPI, GDP)", docsUrl: "https://fred.stlouisfed.org/docs/api/fred/" },
  { name: "BLS", envVar: "BLS_API_KEY", configured: false, priority: "P1", description: "Employment and labor market statistics", docsUrl: "https://www.bls.gov/developers/" },
  { name: "Walk Score", envVar: "WALKSCORE_API_KEY", configured: false, priority: "P1", description: "Walkability, transit, and bike scores", docsUrl: "https://www.walkscore.com/professional/api.php" },
  { name: "GreatSchools", envVar: "GREATSCHOOLS_API_KEY", configured: false, priority: "P1", description: "School ratings and proximity data", docsUrl: "https://www.greatschools.org/api/" },
];

const tabItems = [
  { id: "api-keys", label: "API Keys", icon: <Key className="h-4 w-4" /> },
  { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  { id: "appearance", label: "Appearance", icon: <Palette className="h-4 w-4" /> },
  { id: "account", label: "Account", icon: <Shield className="h-4 w-4" /> },
];

function priorityVariant(p: string) {
  if (p === "P0") return "danger" as const;
  if (p === "P1") return "warning" as const;
  return "neutral" as const;
}

export default function SettingsPage() {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [notifications, setNotifications] = useState({
    dealAlerts: true,
    marketSignals: true,
    priceChanges: false,
    weeklyDigest: true,
  });

  const configuredCount = apiKeys.filter((k) => k.configured).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-gray-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure API keys, notifications, and preferences
          </p>
        </div>
      </div>

      <Tabs tabs={tabItems}>
        {(activeTab) => (
          <>
            {activeTab === "api-keys" && (
              <div className="space-y-6 animate-fade-in">
                {/* Summary bar */}
                <div className="flex items-center gap-4 p-4 bg-surface-elevated rounded-lg border border-surface-border">
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">
                      <span className="font-bold text-money-400">{configuredCount}</span>
                      {" / "}{apiKeys.length} API keys configured
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Mock data used when keys are not configured
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="danger" size="sm">P0 = Required</Badge>
                    <Badge variant="warning" size="sm">P1 = Recommended</Badge>
                    <Badge variant="neutral" size="sm">P2 = Optional</Badge>
                  </div>
                </div>

                {/* Key list */}
                <div className="space-y-3">
                  {apiKeys.map((key) => (
                    <div
                      key={key.envVar}
                      className="bg-surface-card border border-surface-border rounded-xl p-5 hover:border-surface-muted transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {key.configured ? (
                            <CheckCircle2 className="h-5 w-5 text-money-400 mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-600 mt-0.5" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-gray-200">
                                {key.name}
                              </h3>
                              <Badge variant={priorityVariant(key.priority)} size="sm">
                                {key.priority}
                              </Badge>
                              <Badge
                                variant={key.configured ? "success" : "neutral"}
                                size="sm"
                              >
                                {key.configured ? "Active" : "Not configured"}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {key.description}
                            </p>
                            <p className="text-xs text-gray-600 font-mono mt-1">
                              {key.envVar}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={key.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-500 hover:text-money-400 transition-colors flex items-center gap-1"
                          >
                            Docs <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>

                      {/* Key input */}
                      <div className="mt-3 flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type={showKeys[key.envVar] ? "text" : "password"}
                            placeholder={key.configured ? "••••••••••••••••" : `Enter ${key.envVar}`}
                            disabled={key.configured}
                            className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-200 font-mono placeholder-gray-600 focus:ring-2 focus:ring-money-600/50 focus:border-money-600 transition-colors disabled:opacity-50"
                          />
                          <button
                            onClick={() =>
                              setShowKeys((prev) => ({
                                ...prev,
                                [key.envVar]: !prev[key.envVar],
                              }))
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                          >
                            {showKeys[key.envVar] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <Button variant="secondary" size="sm">
                          <Save className="h-3.5 w-3.5" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-4 animate-fade-in">
                <Card header="Email Notifications">
                  <div className="space-y-4">
                    {[
                      { key: "dealAlerts" as const, label: "Deal Alerts", desc: "Get notified when new high-grade deals are found in your target markets" },
                      { key: "marketSignals" as const, label: "Market Signals", desc: "Receive alerts for significant market changes (inventory, rates, prices)" },
                      { key: "priceChanges" as const, label: "Price Changes", desc: "Notify when tracked properties change in value by more than 2%" },
                      { key: "weeklyDigest" as const, label: "Weekly Digest", desc: "Summary of portfolio performance, new deals, and market trends" },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-4 bg-surface-elevated rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-200">
                            {item.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setNotifications((prev) => ({
                              ...prev,
                              [item.key]: !prev[item.key],
                            }))
                          }
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            notifications[item.key]
                              ? "bg-money-600"
                              : "bg-gray-700"
                          }`}
                        >
                          <div
                            className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                              notifications[item.key]
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-4 animate-fade-in">
                <Card header="Theme">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { name: "Dark (Money)", color: "bg-surface", active: true },
                      { name: "Light", color: "bg-gray-100", active: false },
                      { name: "System", color: "bg-gradient-to-r from-surface to-gray-100", active: false },
                    ].map((theme) => (
                      <button
                        key={theme.name}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          theme.active
                            ? "border-money-500 bg-surface-elevated"
                            : "border-surface-border bg-surface-card hover:border-surface-muted opacity-50"
                        }`}
                      >
                        <div
                          className={`h-16 rounded-lg mb-3 ${theme.color} border border-surface-border`}
                        />
                        <p className="text-sm font-medium text-gray-200">
                          {theme.name}
                        </p>
                        {theme.active && (
                          <p className="text-xs text-money-400 mt-0.5">Active</p>
                        )}
                      </button>
                    ))}
                  </div>
                </Card>

                <Card header="Display">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-surface-elevated rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-200">Compact Mode</p>
                        <p className="text-xs text-gray-500">Reduce spacing for denser information display</p>
                      </div>
                      <div className="w-11 h-6 rounded-full bg-gray-700 relative">
                        <div className="absolute top-1 left-1 h-4 w-4 rounded-full bg-white" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-surface-elevated rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-200">Show Confidence Bands</p>
                        <p className="text-xs text-gray-500">Display confidence intervals on charts and forecasts</p>
                      </div>
                      <div className="w-11 h-6 rounded-full bg-money-600 relative">
                        <div className="absolute top-1 h-4 w-4 rounded-full bg-white translate-x-6" />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "account" && (
              <div className="space-y-4 animate-fade-in">
                <Card header="Profile">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-money-500 to-money-700 flex items-center justify-center">
                        <span className="text-xl font-bold text-white">JD</span>
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-200">
                          John Doe
                        </p>
                        <p className="text-sm text-gray-500">
                          john@example.com
                        </p>
                        <Badge variant="success" size="sm">Pro Plan</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-border">
                      <div>
                        <p className="text-xs text-gray-500">Member Since</p>
                        <p className="text-sm text-gray-300">January 2025</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Analyses This Month</p>
                        <p className="text-sm text-gray-300">47 / 100</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card header="Security">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-surface-elevated rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-200">Password</p>
                        <p className="text-xs text-gray-500">Last changed 30 days ago</p>
                      </div>
                      <Button variant="secondary" size="sm">Change</Button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-surface-elevated rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-200">Two-Factor Authentication</p>
                        <p className="text-xs text-gray-500">Add an extra layer of security</p>
                      </div>
                      <Button variant="secondary" size="sm">Enable</Button>
                    </div>
                  </div>
                </Card>

                <Card header="Danger Zone">
                  <div className="flex items-center justify-between p-4 bg-red-900/10 border border-red-900/30 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-red-400">Delete Account</p>
                      <p className="text-xs text-gray-500">Permanently delete your account and all data</p>
                    </div>
                    <Button variant="danger" size="sm">Delete Account</Button>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}
