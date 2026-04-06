import React, { useEffect, useLayoutEffect, useRef } from "react";
import SchoolListSection from "../sidebar/SchoolListSection";

/** ~2 school rows visible; list scrolls for the rest. */
const MOBILE_CARD_LIST_SCROLL_PX = 168;

function bucketIndexForSchool(id, topItems, middleItems, bottomItems) {
  if (id == null) return null;
  if (topItems.some((s) => s.id === id)) return 0;
  if (middleItems.some((s) => s.id === id)) return 1;
  if (bottomItems.some((s) => s.id === id)) return 2;
  return null;
}

function titleWithCount(label, count) {
  return (
    <>
      {label}{" "}
      <span className="v2-section-title-count">({count})</span>
    </>
  );
}

function rowEsc(id) {
  return typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape(String(id))
    : String(id);
}

/** Scroll list so the row wrapper sits at the top (transport panel opens below in-card). */
function scrollListSoRowAtTop(listEl, rowEl) {
  if (!listEl || !rowEl) return;
  const listRect = listEl.getBoundingClientRect();
  const rowRect = rowEl.getBoundingClientRect();
  const nextTop = rowRect.top - listRect.top + listEl.scrollTop;
  listEl.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
}

/**
 * Phone-only: horizontal swipe between the three school buckets (same as left column on desktop).
 */
export default function MobileSchoolCardsDeck({
  topItems,
  middleItems,
  bottomItems,
  selectedIds,
  onToggleSchool,
  homeLocation,
  transportSchool,
  onOpenTransport,
  onCloseTransport,
  onSelectRoute,
  onHoverRoute,
  onLeaveRoute,
  onLeaveOptionsList,
  onClearRoute,
  onOpenSchoolDetails,
  onSchoolRowClick,
  drawerSchoolId,
  focusedSchoolId,
  catchmentCheckBySchoolId,
  catchmentLoading,
  /** Resets horizontal + vertical scroll when home moves */
  homeScrollKey,
  onClearAllCatchments,
}) {
  const railRef = useRef(null);
  const cardRefs = [useRef(null), useRef(null), useRef(null)];
  const listRefs = [useRef(null), useRef(null), useRef(null)];
  const prevHomeScrollKeyRef = useRef(null);
  /** After home moves, stay on “Schools in Catchment” (rail start); skip one focus-driven rail/list snap */
  const skipFocusAlignForHomeChangeRef = useRef(false);

  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const homeChanged = prevHomeScrollKeyRef.current !== homeScrollKey;
    prevHomeScrollKeyRef.current = homeScrollKey;
    if (!homeChanged) return;

    skipFocusAlignForHomeChangeRef.current = true;
    rail.scrollLeft = 0;
    listRefs.forEach((r) => {
      if (r.current) r.current.scrollTop = 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listRefs stable
  }, [homeScrollKey]);

  useEffect(() => {
    const idx = bucketIndexForSchool(
      focusedSchoolId,
      topItems,
      middleItems,
      bottomItems
    );
    if (idx == null) return;

    if (skipFocusAlignForHomeChangeRef.current) {
      skipFocusAlignForHomeChangeRef.current = false;
      return;
    }

    const rail = railRef.current;
    const card = cardRefs[idx].current;
    const listEl = listRefs[idx].current;

    if (rail && card) {
      const targetLeft = card.offsetLeft - (rail.clientWidth - card.clientWidth) / 2;
      rail.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: "smooth",
      });
    }

    if (listEl && focusedSchoolId != null) {
      const row = listEl.querySelector(
        `[data-school-row-id="${rowEsc(focusedSchoolId)}"]`
      );
      row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cardRefs, listRefs stable
  }, [
    focusedSchoolId,
    topItems,
    middleItems,
    bottomItems,
  ]);

  useLayoutEffect(() => {
    const id = transportSchool?.id;
    if (id == null) return;

    const idx = bucketIndexForSchool(id, topItems, middleItems, bottomItems);
    if (idx == null) return;

    const apply = () => {
      const rail = railRef.current;
      const card = cardRefs[idx].current;
      const listEl = listRefs[idx].current;
      if (rail && card) {
        const targetLeft =
          card.offsetLeft - (rail.clientWidth - card.clientWidth) / 2;
        rail.scrollTo({
          left: Math.max(0, targetLeft),
          behavior: "smooth",
        });
      }
      if (!listEl) return;
      const row = listEl.querySelector(`[data-school-row-id="${rowEsc(id)}"]`);
      scrollListSoRowAtTop(listEl, row);
    };

    apply();
    const t = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cardRefs, listRefs stable
  }, [transportSchool?.id, topItems, middleItems, bottomItems]);

  return (
    <section className="v2-mobile-cards-deck" aria-label="School lists">
      <div ref={railRef} className="v2-mobile-cards-rail">
        <div ref={cardRefs[0]} className="v2-mobile-card v2-mobile-card--snap">
          <SchoolListSection
            title={titleWithCount("Schools in Catchment", topItems.length)}
            sectionAccent="green"
            items={topItems}
            selectedIds={selectedIds}
            onToggle={onToggleSchool}
            onClearAllCatchments={onClearAllCatchments}
            homeLocation={homeLocation}
            transportSchool={transportSchool}
            onOpenTransport={onOpenTransport}
            onCloseTransport={onCloseTransport}
            onSelectRoute={onSelectRoute}
            onHoverRoute={onHoverRoute}
            onLeaveRoute={onLeaveRoute}
            onLeaveOptionsList={onLeaveOptionsList}
            onClearRoute={onClearRoute}
            onOpenDetails={onOpenSchoolDetails}
            onRowClick={onSchoolRowClick}
            drawerSchoolId={drawerSchoolId}
            focusedSchoolId={focusedSchoolId}
            showCatchmentHover
            catchmentCheckBySchoolId={catchmentCheckBySchoolId}
            catchmentLoading={catchmentLoading}
            emptyText="No schools found in catchment for this home."
            showLoadMore={false}
            scrollHeight={MOBILE_CARD_LIST_SCROLL_PX}
            compactMobileCard
            listRef={listRefs[0]}
          />
        </div>

        <div ref={cardRefs[1]} className="v2-mobile-card v2-mobile-card--snap">
          <SchoolListSection
            title={titleWithCount(
              "Schools with Open Catchment",
              middleItems.length
            )}
            sectionAccent="blue"
            items={middleItems}
            selectedIds={selectedIds}
            onToggle={onToggleSchool}
            onClearAllCatchments={onClearAllCatchments}
            homeLocation={homeLocation}
            transportSchool={transportSchool}
            onOpenTransport={onOpenTransport}
            onCloseTransport={onCloseTransport}
            onSelectRoute={onSelectRoute}
            onHoverRoute={onHoverRoute}
            onLeaveRoute={onLeaveRoute}
            onLeaveOptionsList={onLeaveOptionsList}
            onClearRoute={onClearRoute}
            onOpenDetails={onOpenSchoolDetails}
            onRowClick={onSchoolRowClick}
            drawerSchoolId={drawerSchoolId}
            focusedSchoolId={focusedSchoolId}
            emptyText="No open-catchment schools to show."
            showLoadMore={false}
            scrollHeight={MOBILE_CARD_LIST_SCROLL_PX}
            compactMobileCard
            listRef={listRefs[1]}
          />
        </div>

        <div ref={cardRefs[2]} className="v2-mobile-card v2-mobile-card--snap">
          <SchoolListSection
            title={titleWithCount("All Other Schools", bottomItems.length)}
            sectionAccent="yellow"
            items={bottomItems}
            selectedIds={selectedIds}
            onToggle={onToggleSchool}
            onClearAllCatchments={onClearAllCatchments}
            homeLocation={homeLocation}
            transportSchool={transportSchool}
            onOpenTransport={onOpenTransport}
            onCloseTransport={onCloseTransport}
            onSelectRoute={onSelectRoute}
            onHoverRoute={onHoverRoute}
            onLeaveRoute={onLeaveRoute}
            onLeaveOptionsList={onLeaveOptionsList}
            onClearRoute={onClearRoute}
            onOpenDetails={onOpenSchoolDetails}
            onRowClick={onSchoolRowClick}
            drawerSchoolId={drawerSchoolId}
            focusedSchoolId={focusedSchoolId}
            emptyText="No other schools to show."
            showLoadMore={false}
            scrollHeight={MOBILE_CARD_LIST_SCROLL_PX}
            compactMobileCard
            listRef={listRefs[2]}
          />
        </div>
      </div>
    </section>
  );
}
