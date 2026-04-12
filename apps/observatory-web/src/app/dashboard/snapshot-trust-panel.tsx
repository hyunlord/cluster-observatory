import React from "react";
import type { GkeDashboardData } from "../../lib/gke-dashboard";

interface SnapshotTrustPanelProps {
  snapshot: GkeDashboardData["snapshot"];
  description?: string;
}

function confidenceLabel(confidence: GkeDashboardData["snapshot"]["collectorConfidence"]) {
  if (confidence === "high") {
    return "High confidence";
  }

  if (confidence === "medium") {
    return "Medium confidence";
  }

  return "Low confidence";
}

export function SnapshotTrustPanel({
  snapshot,
  description = "Confidence and coverage signals for the snapshot behind this view"
}: SnapshotTrustPanelProps) {
  return (
    <div className="detail-section">
      <div className="detail-section-header">
        <h3>Snapshot trust</h3>
        <small className="muted">{description}</small>
      </div>
      <div className="side-kpi-list side-kpi-list-compact">
        <div className="side-kpi">
          <span>Confidence</span>
          <strong>{confidenceLabel(snapshot.collectorConfidence)}</strong>
        </div>
        <div className="side-kpi">
          <span>Collector status</span>
          <strong>{snapshot.collectorStatus}</strong>
        </div>
        <div className="side-kpi">
          <span>Missing sources</span>
          <strong>{snapshot.missingSources.length > 0 ? snapshot.missingSources.join(", ") : "None"}</strong>
        </div>
      </div>
      <p className="muted">{snapshot.trustNote}</p>
      <div className="drawer-tags">
        {snapshot.affectedAreas.length > 0 ? (
          snapshot.affectedAreas.map((area) => <span key={area}>{area}</span>)
        ) : (
          <span>Full coverage</span>
        )}
      </div>
      {snapshot.issues.length > 0 ? (
        <div className="drawer-pod-list">
          {snapshot.issues.map((issue) => (
            <div className="drawer-pod-row" key={`${issue.source}-${issue.message}`}>
              <div>
                <strong>{issue.source}</strong>
                <p className="muted">{issue.message}</p>
                {issue.detail ? <p className="muted drawer-pod-subline">{issue.detail}</p> : null}
              </div>
              <div className="drawer-pod-metrics">
                <span className={`status-pill status-pill-${issue.severity === "critical" ? "critical" : "warning"}`}>
                  {issue.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
