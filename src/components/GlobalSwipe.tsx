"use client";

import { useEffect, useRef, TouchEvent } from "react";
import { useRouter, usePathname } from "next/navigation";

const ROUTES = [
  { path: "/", name: "Today" },
  { path: "/schedule", name: "Schedule" },
  { path: "/tasks", name: "Tasks" },
  { path: "/focus", name: "Focus" },
  { path: "/settings", name: "Settings" },
];

const TRANSITION_MS = 280;
type Direction = "prev" | "next";
type Surface = HTMLDivElement | null;

function setTransform(element: Surface, x: number, transition = "none") {
  if (!element) return;
  element.style.transition = transition;
  element.style.transform = `translate3d(${x}px, 0, 0)`;
}

export function GlobalSwipe({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentIndex = ROUTES.findIndex((route) => route.path === pathname);

  const currentRef = useRef<HTMLDivElement>(null);
  const surfaceRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];
  const labelRefs = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)];
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const direction = useRef<Direction | null>(null);
  const dragX = useRef(0);
  const visualIndex = useRef(currentIndex);
  const activeSurface = useRef<Surface>(null);
  const gestureSource = useRef<Surface>(null);
  const gestureIncoming = useRef<Surface>(null);
  const targetPath = useRef<string | null>(null);
  const pathnameRef = useRef(pathname);
  const committing = useRef(false);
  const transitionDone = useRef(false);

  pathnameRef.current = pathname;

  const hideSurfaces = () => {
    surfaceRefs.forEach((surface) => {
      if (surface.current) surface.current.style.visibility = "hidden";
    });
  };

  const settleTransition = () => {
    committing.current = false;
    transitionDone.current = false;
    targetPath.current = null;
    activeSurface.current = null;
    gestureSource.current = null;
    gestureIncoming.current = null;
    direction.current = null;
    dragX.current = 0;
    visualIndex.current = currentIndex;
    setTransform(currentRef.current, 0);
    setTransform(surfaceRefs[0].current, 0);
    setTransform(surfaceRefs[1].current, 0);
    hideSurfaces();
  };

  const finishIfReady = () => {
    if (committing.current && transitionDone.current && pathnameRef.current === targetPath.current) {
      settleTransition();
    }
  };

  useEffect(() => {
    if (currentIndex < 0) return;
    if (!committing.current) settleTransition();
    else finishIfReady();
  }, [currentIndex]);

  useEffect(() => {
    if (currentIndex < 0) return;
    if (currentIndex > 0) router.prefetch(ROUTES[currentIndex - 1].path);
    if (currentIndex < ROUTES.length - 1) router.prefetch(ROUTES[currentIndex + 1].path);
  }, [currentIndex, router]);

  if (currentIndex < 0) return <>{children}</>;

  const getRoute = (index: number) => ROUTES[index] ?? null;

  const onTouchStart = (event: TouchEvent) => {
    if (window.innerWidth >= 768) return;
    const target = event.target as HTMLElement;
    const isInteractive = target.closest(
      "button, a, input, textarea, select, [role='button'], [role='slider'], [role='switch'], .overflow-x-auto, .overflow-x-scroll"
    );
    if (isInteractive) return;

    touchStart.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
    direction.current = null;
    dragX.current = 0;
    gestureSource.current = activeSurface.current || currentRef.current;
  };

  const onTouchMove = (event: TouchEvent) => {
    if (!touchStart.current) return;

    const dx = event.touches[0].clientX - touchStart.current.x;
    const dy = event.touches[0].clientY - touchStart.current.y;

    if (direction.current === null) {
      if (Math.abs(dx) <= 10 && Math.abs(dy) <= 10) return;
      if (Math.abs(dx) <= Math.abs(dy)) {
        touchStart.current = null;
        return;
      }

      direction.current = dx > 0 ? "prev" : "next";
      const incomingIndex = visualIndex.current + (direction.current === "prev" ? -1 : 1);
      const incomingRoute = getRoute(incomingIndex);
      if (!incomingRoute) return;

      const surfaceIndex = activeSurface.current === surfaceRefs[0].current ? 1 : 0;
      const incoming = surfaceRefs[surfaceIndex].current;
      gestureIncoming.current = incoming;
      if (labelRefs[surfaceIndex].current) {
        labelRefs[surfaceIndex].current.textContent = incomingRoute.name;
      }
      if (incoming) {
        incoming.style.visibility = "visible";
        setTransform(incoming, direction.current === "prev" ? -window.innerWidth : window.innerWidth);
      }
    }

    if (event.cancelable) event.preventDefault();
    if (!direction.current || !gestureIncoming.current || !gestureSource.current) return;

    let nextDragX = dx;
    const incomingIndex = visualIndex.current + (direction.current === "prev" ? -1 : 1);
    if ((nextDragX > 0 && incomingIndex < 0) || (nextDragX < 0 && incomingIndex >= ROUTES.length)) {
      nextDragX *= 0.2;
    }
    dragX.current = nextDragX;

    setTransform(gestureSource.current, nextDragX);
    setTransform(
      gestureIncoming.current,
      (direction.current === "prev" ? -window.innerWidth : window.innerWidth) + nextDragX
    );
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !direction.current || !gestureSource.current || !gestureIncoming.current) {
      touchStart.current = null;
      direction.current = null;
      return;
    }

    const swipeDirection = direction.current;
    const incomingIndex = visualIndex.current + (swipeDirection === "prev" ? -1 : 1);
    const route = getRoute(incomingIndex);
    const width = window.innerWidth;
    const source = gestureSource.current;
    const incoming = gestureIncoming.current;
    const shouldCommit = route && Math.abs(dragX.current) > width * 0.25;
    touchStart.current = null;

    if (!shouldCommit) {
      setTransform(source, 0, `transform ${TRANSITION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`);
      setTransform(incoming, swipeDirection === "prev" ? -width : width, `transform ${TRANSITION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`);
      window.setTimeout(() => {
        if (activeSurface.current !== source) {
          source.style.visibility = "hidden";
        }
        incoming.style.visibility = "hidden";
      }, TRANSITION_MS);
      direction.current = null;
      return;
    }

    committing.current = true;
    transitionDone.current = false;
    targetPath.current = route.path;
    visualIndex.current = incomingIndex;
    activeSurface.current = incoming;

    setTransform(source, swipeDirection === "prev" ? width : -width, `transform ${TRANSITION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`);
    setTransform(incoming, 0, `transform ${TRANSITION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`);
    router.push(route.path);

    window.setTimeout(() => {
      transitionDone.current = true;
      finishIfReady();
    }, TRANSITION_MS);
    direction.current = null;
  };

  return (
    <div
      className="relative flex-grow w-full h-full overflow-hidden"
      style={{ touchAction: "pan-y" }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div className="absolute inset-0 overflow-hidden bg-zinc-950 pointer-events-none">
        {surfaceRefs.map((surface, index) => (
          <div
            key={index}
            ref={surface}
            className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-zinc-500"
            style={{ visibility: "hidden", willChange: "transform" }}
          >
            <span ref={labelRefs[index]} className="text-lg font-medium tracking-wide" />
          </div>
        ))}
      </div>

      <div ref={currentRef} className="relative h-full w-full bg-zinc-950" style={{ willChange: "transform" }}>
        {children}
      </div>
    </div>
  );
}
