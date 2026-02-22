import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ActionCard } from "./ActionCard";
import type { ProjectResponse } from "@/services/api";
import { FolderKanban, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectCarouselProps {
  projects: ProjectResponse[];
  showOnlyFirst?: boolean;
  className?: string;
}

export function ProjectCarousel({
  projects,
  showOnlyFirst = true,
  className,
}: ProjectCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const filteredProjects = projects.filter((p) => {
    const actions = showOnlyFirst ? p.first_actions : p.actions;
    return actions.length > 0;
  });

  if (filteredProjects.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No actions found
      </div>
    );
  }

  const goToProject = useCallback((index: number) => {
    if (containerRef.current) {
      const container = containerRef.current;
      const slideWidth = container.offsetWidth;
      container.scrollTo({
        left: slideWidth * index,
        behavior: "smooth",
      });
      setCurrentIndex(index);
    }
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex < filteredProjects.length - 1) {
      goToProject(currentIndex + 1);
    }
  }, [currentIndex, filteredProjects.length, goToProject]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      goToProject(currentIndex - 1);
    }
  }, [currentIndex, goToProject]);

  // Handle scroll snap end to update current index
  const handleScroll = useCallback(() => {
    if (containerRef.current && !isDragging) {
      const container = containerRef.current;
      const slideWidth = container.offsetWidth;
      const newIndex = Math.round(container.scrollLeft / slideWidth);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < filteredProjects.length) {
        setCurrentIndex(newIndex);
      }
    }
  }, [currentIndex, filteredProjects.length, isDragging]);

  // Mouse drag handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (containerRef.current?.offsetLeft || 0));
    setScrollLeft(containerRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (containerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 1.5;
    if (containerRef.current) {
      containerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    handleScroll();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goPrev();
      } else if (e.key === "ArrowRight") {
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  const currentProject = filteredProjects[currentIndex];
  const actions = showOnlyFirst
    ? currentProject?.first_actions || []
    : currentProject?.actions || [];

  return (
    <div className={cn("relative", className)}>
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">
            {currentProject?.project_name}
          </h3>
          {showOnlyFirst && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <Zap className="h-3 w-3" />
              {actions.length} First Action{actions.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={goPrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
            {currentIndex + 1} / {filteredProjects.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={goNext}
            disabled={currentIndex === filteredProjects.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Carousel Container */}
      <div
        ref={containerRef}
        className={cn(
          "flex overflow-x-auto snap-x snap-mandatory scrollbar-hide",
          "cursor-grab active:cursor-grabbing",
          isDragging && "cursor-grabbing"
        )}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {filteredProjects.map((project, projectIndex) => {
          const projectActions = showOnlyFirst
            ? project.first_actions
            : project.actions;

          return (
            <div
              key={project.project_id}
              className="flex-none w-full snap-center px-1"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                {projectActions.map((action, actionIndex) => (
                  <ActionCard
                    key={`${project.project_id}-${action.action_index}`}
                    action={action}
                    index={projectIndex === currentIndex ? actionIndex : 0}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dot Indicators */}
      {filteredProjects.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {filteredProjects.map((project, index) => (
            <button
              key={project.project_id}
              onClick={() => goToProject(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                index === currentIndex
                  ? "bg-primary w-6"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Go to ${project.project_name}`}
            />
          ))}
        </div>
      )}

      {/* Swipe Hint */}
      {filteredProjects.length > 1 && currentIndex === 0 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-pulse text-muted-foreground/50 pointer-events-none">
          <ChevronRight className="h-8 w-8" />
        </div>
      )}
    </div>
  );
}
