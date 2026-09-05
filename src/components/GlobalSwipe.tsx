"use client";

import { useState, useRef, useEffect, TouchEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, CheckSquare, Settings, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

const ROUTES = [
  { path: "/", name: "Today", icon: LayoutDashboard },
  { path: "/schedule", name: "Schedule", icon: Calendar },
  { path: "/tasks", name: "Tasks", icon: CheckSquare },
  { path: "/focus", name: "Focus", icon: Timer },
  { path: "/settings", name: "Settings", icon: Settings },
];

export function GlobalSwipe({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const currentIndex = ROUTES.findIndex(r => r.path === pathname);
  
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipingTo, setSwipingTo] = useState<"prev" | "next" | null>(null);
  
  const touchStart = useRef<{ x: number, y: number } | null>(null);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  useEffect(() => {
    // Reset when pathname changes
    setDragX(0);
    setIsDragging(false);
    setSwipingTo(null);
  }, [pathname]);

  // If not on a main route, just render children without swipe
  if (currentIndex === -1) {
    return <>{children}</>;
  }

  const prevRoute = currentIndex > 0 ? ROUTES[currentIndex - 1] : null;
  const nextRoute = currentIndex < ROUTES.length - 1 ? ROUTES[currentIndex + 1] : null;

  const onTouchStart = (e: TouchEvent) => {
    // Only apply on mobile layout (Tailwind 'md' breakpoint is 768px)
    if (window.innerWidth >= 768) return;

    const target = e.target as HTMLElement;
    
    // Do not interfere with interactive elements
    const isInteractive = target.closest("button, a, input, textarea, select, [role='button'], [role='slider'], [role='switch'], .overflow-x-auto, .overflow-x-scroll");
    if (isInteractive) return;

    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    isHorizontalSwipe.current = null;
    setIsDragging(false);
    setDragX(0);
    setSwipingTo(null);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!touchStart.current) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - touchStart.current.x;
    const dy = currentY - touchStart.current.y;

    // Determine swipe direction if not yet determined
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        if (Math.abs(dx) > Math.abs(dy)) {
          isHorizontalSwipe.current = true;
        } else {
          isHorizontalSwipe.current = false;
          touchStart.current = null; // Cancel horizontal swipe
          return;
        }
      } else {
        return; // Not moved enough to determine
      }
    }

    if (isHorizontalSwipe.current) {
      // It's a horizontal swipe, prevent vertical scrolling
      if (e.cancelable) e.preventDefault();
      
      setIsDragging(true);
      
      // Calculate drag resistance at boundaries
      let newDragX = dx;
      if (newDragX > 0 && !prevRoute) newDragX = newDragX * 0.2; // Resist pulling past start
      if (newDragX < 0 && !nextRoute) newDragX = newDragX * 0.2; // Resist pulling past end
      
      setDragX(newDragX);
      if (newDragX > 0 && prevRoute) setSwipingTo("prev");
      else if (newDragX < 0 && nextRoute) setSwipingTo("next");
      else setSwipingTo(null);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !isHorizontalSwipe.current) {
      touchStart.current = null;
      isHorizontalSwipe.current = null;
      return;
    }

    setIsDragging(false);
    const threshold = window.innerWidth * 0.25;

    if (dragX > threshold && prevRoute) {
      // Complete swipe to prev
      setDragX(window.innerWidth);
      router.push(prevRoute.path);
    } else if (dragX < -threshold && nextRoute) {
      // Complete swipe to next
      setDragX(-window.innerWidth);
      router.push(nextRoute.path);
    } else {
      // Snap back
      setDragX(0);
    }

    touchStart.current = null;
    isHorizontalSwipe.current = null;
    
    // Reset dragX after a delay to allow the new page to load, but we rely on Next.js 
    // replacing the component. However, since GlobalSwipe is in layout, it stays mounted.
    // We must reset dragX once the path changes.
  };

  return (
    <div 
      className="relative flex-grow w-full h-full overflow-hidden"
      style={{ touchAction: 'pan-y' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {/* Background container for incoming pages */}
      <div className="absolute inset-0 bg-zinc-950 pointer-events-none">
        {swipingTo === "prev" && prevRoute && (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500"
            style={{ 
              transform: `translateX(calc(-100% + ${dragX}px))`,
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
            }}
          >
            <prevRoute.icon className="w-12 h-12 mb-4 opacity-50" />
            <span className="text-lg font-medium tracking-wide">{prevRoute.name}</span>
          </div>
        )}

        {swipingTo === "next" && nextRoute && (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500"
            style={{ 
              transform: `translateX(calc(100% + ${dragX}px))`,
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
            }}
          >
            <nextRoute.icon className="w-12 h-12 mb-4 opacity-50" />
            <span className="text-lg font-medium tracking-wide">{nextRoute.name}</span>
          </div>
        )}
      </div>

      {/* Current Page */}
      <div 
        className={cn(
          "relative w-full h-full bg-zinc-950",
          !isDragging && "transition-transform duration-300 ease-out"
        )}
        style={{ 
          transform: `translateX(${dragX}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
