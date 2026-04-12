"use client";

import React, { useEffect, useMemo, useState } from "react";

interface LiveControlsProps {
  capturedAt: string;
  defaultAutoRefresh?: boolean;
  intervalMs?: number;
}

function describeRelativeAge(capturedAt: string) {
  const ageSeconds = Math.max(0, Math.round((Date.now() - new Date(capturedAt).getTime()) / 1000));
  if (ageSeconds < 60) {
    return `${ageSeconds}s ago`;
  }

  return `${Math.round(ageSeconds / 60)}m ago`;
}

export function LiveControls({
  capturedAt,
  defaultAutoRefresh = true,
  intervalMs = 30_000
}: LiveControlsProps) {
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(defaultAutoRefresh);
  const [ageLabel, setAgeLabel] = useState(() => describeRelativeAge(capturedAt));

  useEffect(() => {
    setAgeLabel(describeRelativeAge(capturedAt));
  }, [capturedAt]);

  useEffect(() => {
    if (!autoRefreshEnabled) {
      return undefined;
    }

    const refreshTimer = window.setInterval(() => {
      window.location.reload();
    }, intervalMs);

    return () => window.clearInterval(refreshTimer);
  }, [autoRefreshEnabled, intervalMs]);

  useEffect(() => {
    const ageTimer = window.setInterval(() => {
      setAgeLabel(describeRelativeAge(capturedAt));
    }, 1000);

    return () => window.clearInterval(ageTimer);
  }, [capturedAt]);

  const autoRefreshLabel = useMemo(
    () => (autoRefreshEnabled ? "Auto-refresh on" : "Auto-refresh off"),
    [autoRefreshEnabled]
  );

  return (
    <div className="live-controls">
      <button type="button" className="control-pill" onClick={() => setAutoRefreshEnabled((value) => !value)}>
        {autoRefreshLabel}
      </button>
      <button type="button" className="control-pill control-pill-solid" onClick={() => window.location.reload()}>
        Refresh now
      </button>
      <p className="control-hint">Last updated {ageLabel}</p>
    </div>
  );
}
