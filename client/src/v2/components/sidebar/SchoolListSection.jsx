// client/src/v2/components/sidebar/SchoolListSection.jsx

import React, { useEffect, useMemo, useState } from "react";
import SchoolRow from "./SchoolRow";
import TransportPanel from "../transport/TransportPanel";

function formatTier(key) {
  if (!key) return "";
  const k = String(key);
  if (/^pa\d+$/i.test(k)) return k.toUpperCase();
  return k.charAt(0).toUpperCase() + k.slice(1);
}

function makeHoverTitle(check) {
  if (!check?.inCatchment) return "";

  const tier = formatTier(check.matchedBy);
  const distance =
    typeof check.distanceKm === "number" ? ` (${check.distanceKm} km)` : "";

  if (tier) return `In catchment: ${tier}${distance}`;
  return `In catchment${distance}`;
}

export default function SchoolListSection({
  title,
  items,
  selectedIds,
  onToggle,

  // transport props
  homeLocation,
  transportSchool,
  onOpenTransport,
  onCloseTransport,
  onSelectRoute,
  onHoverRoute,
  onLeaveRoute,
  onLeaveOptionsList,
  onClearRoute,

  // catchment hover
  showCatchmentHover,
  catchmentCheckBySchoolId,
  catchmentLoading,

  // ✅ load-more + scroll container
  initialVisible,
  loadStep,
  showLoadMore,
  scrollHeight,
  emptyText,

  // ✅ additive
  onOpenDetails,
  onRowClick,
  drawerSchoolId,
  focusedSchoolId,

  /** Left panel: visual group — green | blue | yellow */
  sectionAccent,
}) {
  const safeItems = Array.isArray(items) ? items : [];
  const safeSelectedIds = Array.isArray(selectedIds) ? selectedIds : [];

  const initial = useMemo(() => {
    if (typeof initialVisible === "number" && initialVisible > 0)
      return initialVisible;
    return safeItems.length;
  }, [initialVisible, safeItems.length]);

  const step = typeof loadStep === "number" && loadStep > 0 ? loadStep : 10;

  const [visibleCount, setVisibleCount] = useState(initial);

  // Reset visible count when list changes materially
  useEffect(() => {
    setVisibleCount(initial);
  }, [initial]);

  const visibleItems = useMemo(() => {
    if (!showLoadMore) return safeItems;
    return safeItems.slice(0, visibleCount);
  }, [safeItems, showLoadMore, visibleCount]);

  const canLoadMore =
    !!showLoadMore && visibleCount < safeItems.length && safeItems.length > 0;

  const sectionClass = [
    "v2-section",
    sectionAccent ? `v2-section--accent-${sectionAccent}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={sectionClass}>
      <div className="v2-section-header">
        <div className="v2-section-title">{title}</div>
        <button className="v2-link-btn">View all</button>
      </div>

      <div
        className="v2-section-list"
        style={
          typeof scrollHeight === "number" && scrollHeight > 0
            ? { maxHeight: scrollHeight, overflowY: "auto" }
            : undefined
        }
      >
        {visibleItems.length === 0 ? (
          <div style={{ fontSize: 13, color: "#666", padding: "6px 2px" }}>
            {catchmentLoading ? "Loading…" : (emptyText || "No schools to show.")}
          </div>
        ) : (
          visibleItems.map((s) => {
            const isOpen = !!transportSchool && transportSchool.id === s.id;

            const check = showCatchmentHover
              ? catchmentCheckBySchoolId?.[s.id]
              : undefined;

            let hoverTitle = "";
            if (showCatchmentHover) {
              if (check) hoverTitle = makeHoverTitle(check);
              else if (catchmentLoading) hoverTitle = "Checking catchment…";
            }

            return (
              <React.Fragment key={s.id}>
                <SchoolRow
                  school={s}
                  checked={safeSelectedIds.includes(s.id)}
                  onToggle={onToggle}
                  onOpenTransport={onOpenTransport}
                  hoverTitle={hoverTitle}
                  onOpenDetails={onOpenDetails}
                  onRowClick={onRowClick}
                  isDrawerOpen={drawerSchoolId != null && drawerSchoolId === s.id}
                  isTransportOpen={!!transportSchool && transportSchool.id === s.id}
                  isCatchmentSelected={safeSelectedIds.includes(s.id)}
                  isMapFocused={
                    focusedSchoolId != null && focusedSchoolId === s.id
                  }
                />

                {isOpen ? (
                  <div className="v2-transport-inline">
                    <TransportPanel
                      school={transportSchool}
                      homeLocation={homeLocation}
                      onClose={onCloseTransport}
                      onSelectRoute={onSelectRoute}
                      onHoverRoute={onHoverRoute}
                      onLeaveRoute={onLeaveRoute}
                      onLeaveOptionsList={onLeaveOptionsList}
                      onClearRoute={onClearRoute}
                    />
                  </div>
                ) : null}
              </React.Fragment>
            );
          })
        )}
      </div>

      {canLoadMore ? (
        <div style={{ marginTop: 8 }}>
          <button
            className="v2-link-btn"
            onClick={() => setVisibleCount((n) => n + step)}
          >
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );
}