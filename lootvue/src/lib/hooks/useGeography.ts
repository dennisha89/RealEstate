import { create } from "zustand";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type GeoLevel = "national" | "state" | "city" | "zip";

export interface GeoSelection {
  stateCode?: string;   // e.g. "TX"
  stateName?: string;   // e.g. "Texas"
  cityName?: string;    // e.g. "Austin"
  zipCode?: string;     // e.g. "78745"
}

export interface GeoBreadcrumb {
  label: string;
  level: GeoLevel;
}

// ─── Store state + actions ─────────────────────────────────────────────────────

interface GeographyState {
  // Current drill level
  level: GeoLevel;

  // Active selections — only fields up to current level are populated
  selection: GeoSelection;

  // ── Computed (derived inline from state) ──────────────────────────────────
  // Exposed as plain fields that are recomputed on every set() call so
  // component selectors can use them without calling a function.
  geoKey: string;
  breadcrumbs: GeoBreadcrumb[];

  // ── Actions ───────────────────────────────────────────────────────────────
  selectState: (code: string, name: string) => void;
  selectCity: (cityName: string) => void;
  selectZip: (zip: string) => void;
  goToLevel: (level: GeoLevel) => void;
  reset: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildGeoKey(level: GeoLevel, selection: GeoSelection): string {
  switch (level) {
    case "national":
      return "national";
    case "state":
      return selection.stateCode ?? "national";
    case "city":
      return [selection.stateCode, selection.cityName]
        .filter(Boolean)
        .join("-");
    case "zip":
      return [selection.stateCode, selection.cityName, selection.zipCode]
        .filter(Boolean)
        .join("-");
  }
}

function buildBreadcrumbs(
  level: GeoLevel,
  selection: GeoSelection,
): GeoBreadcrumb[] {
  const crumbs: GeoBreadcrumb[] = [{ label: "National", level: "national" }];

  if (
    (level === "state" || level === "city" || level === "zip") &&
    selection.stateName
  ) {
    crumbs.push({ label: selection.stateName, level: "state" });
  }

  if ((level === "city" || level === "zip") && selection.cityName) {
    crumbs.push({ label: selection.cityName, level: "city" });
  }

  if (level === "zip" && selection.zipCode) {
    crumbs.push({ label: selection.zipCode, level: "zip" });
  }

  return crumbs;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

const INITIAL_SELECTION: GeoSelection = {};
const INITIAL_LEVEL: GeoLevel = "national";

export const useGeographyStore = create<GeographyState>((set) => ({
  level: INITIAL_LEVEL,
  selection: INITIAL_SELECTION,
  geoKey: "national",
  breadcrumbs: [{ label: "National", level: "national" }],

  selectState: (code, name) => {
    const level: GeoLevel = "state";
    // Selecting a state clears city and zip
    const selection: GeoSelection = { stateCode: code, stateName: name };
    set({
      level,
      selection,
      geoKey: buildGeoKey(level, selection),
      breadcrumbs: buildBreadcrumbs(level, selection),
    });
  },

  selectCity: (cityName) => {
    set((state) => {
      const level: GeoLevel = "city";
      // Selecting a city clears zip, preserves state
      const selection: GeoSelection = {
        stateCode: state.selection.stateCode,
        stateName: state.selection.stateName,
        cityName,
      };
      return {
        level,
        selection,
        geoKey: buildGeoKey(level, selection),
        breadcrumbs: buildBreadcrumbs(level, selection),
      };
    });
  },

  selectZip: (zipCode) => {
    set((state) => {
      const level: GeoLevel = "zip";
      const selection: GeoSelection = {
        stateCode: state.selection.stateCode,
        stateName: state.selection.stateName,
        cityName: state.selection.cityName,
        zipCode,
      };
      return {
        level,
        selection,
        geoKey: buildGeoKey(level, selection),
        breadcrumbs: buildBreadcrumbs(level, selection),
      };
    });
  },

  goToLevel: (targetLevel) => {
    set((state) => {
      // Trim the selection down to the target level's scope
      let selection: GeoSelection = {};
      if (
        targetLevel === "state" ||
        targetLevel === "city" ||
        targetLevel === "zip"
      ) {
        selection.stateCode = state.selection.stateCode;
        selection.stateName = state.selection.stateName;
      }
      if (targetLevel === "city" || targetLevel === "zip") {
        selection.cityName = state.selection.cityName;
      }
      if (targetLevel === "zip") {
        selection.zipCode = state.selection.zipCode;
      }

      // Guard: if navigating up to a level that has no data, fall back to national
      if (targetLevel === "state" && !selection.stateCode) {
        const level: GeoLevel = "national";
        selection = {};
        return {
          level,
          selection,
          geoKey: buildGeoKey(level, selection),
          breadcrumbs: buildBreadcrumbs(level, selection),
        };
      }
      if (targetLevel === "city" && !selection.cityName) {
        // Fall back to state
        const level: GeoLevel = "state";
        selection = { stateCode: state.selection.stateCode, stateName: state.selection.stateName };
        return {
          level,
          selection,
          geoKey: buildGeoKey(level, selection),
          breadcrumbs: buildBreadcrumbs(level, selection),
        };
      }

      return {
        level: targetLevel,
        selection,
        geoKey: buildGeoKey(targetLevel, selection),
        breadcrumbs: buildBreadcrumbs(targetLevel, selection),
      };
    });
  },

  reset: () =>
    set({
      level: INITIAL_LEVEL,
      selection: INITIAL_SELECTION,
      geoKey: "national",
      breadcrumbs: [{ label: "National", level: "national" }],
    }),
}));

// ─── Hook (thin wrapper around the store for ergonomic component imports) ──────

/**
 * useGeography — primary hook for all geography drill-down consumers.
 *
 * Every chart on the Markets page should include `geoKey` in its dependency
 * array (or as a recharts `key` prop) so it re-renders when geography changes.
 *
 * Example:
 *   const { geoKey, level, selectState } = useGeography();
 *   <AreaChart key={geoKey} ... />
 */
export function useGeography() {
  return useGeographyStore();
}
