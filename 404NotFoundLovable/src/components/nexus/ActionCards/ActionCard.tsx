import { cn } from "@/lib/utils";
import { Phone, Mail, User, Building2 } from "lucide-react";
import type { ActionResponse } from "@/services/api";

interface ActionCardProps {
  action: ActionResponse;
  index: number;
  className?: string;
}

const urgencyConfig = {
  "VERY HIGH": {
    color: "bg-red-500",
    textColor: "text-red-500",
    borderColor: "border-red-200",
    bgColor: "bg-red-50",
    pulse: true,
  },
  HIGH: {
    color: "bg-orange-500",
    textColor: "text-orange-500",
    borderColor: "border-orange-200",
    bgColor: "bg-orange-50",
    pulse: false,
  },
  MEDIUM: {
    color: "bg-yellow-500",
    textColor: "text-yellow-500",
    borderColor: "border-yellow-200",
    bgColor: "bg-yellow-50",
    pulse: false,
  },
  LOW: {
    color: "bg-gray-400",
    textColor: "text-gray-500",
    borderColor: "border-gray-200",
    bgColor: "bg-gray-50",
    pulse: false,
  },
};

export function ActionCard({ action, index, className }: ActionCardProps) {
  const config = urgencyConfig[action.urgency];
  const hasCall = action.response_type === "call" || action.response_type === "both";
  const hasEmail = action.response_type === "email" || action.response_type === "both";
  const hasContact = hasCall || hasEmail;

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-white p-4 shadow-sm transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-1",
        "opacity-0 animate-card-slide-in",
        config.borderColor,
        className
      )}
      style={{
        "--card-index": index,
        animationDelay: `${index * 100}ms`,
      } as React.CSSProperties}
    >
      {/* Urgency Badge */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white",
            config.color,
            config.pulse && "animate-urgency-pulse"
          )}
        >
          {action.urgency}
        </span>

        {/* Action Index */}
        <span className="text-xs text-muted-foreground font-mono">
          #{action.action_index + 1}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-foreground leading-relaxed mb-4 line-clamp-3">
        {action.description}
      </p>

      {/* Divider */}
      <div className="border-t border-border my-3" />

      {/* People & Department */}
      <div className="space-y-2 mb-3">
        {action.people.length > 0 && (
          <div
            className="flex items-center gap-2 text-sm animate-tag-slide-in"
            style={{ animationDelay: `${index * 100 + 200}ms` }}
          >
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-foreground font-medium truncate">
              {action.people.join(", ")}
            </span>
          </div>
        )}

        <div
          className="flex items-center gap-2 text-sm animate-tag-slide-in"
          style={{ animationDelay: `${index * 100 + 300}ms` }}
        >
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span
            className={cn(
              "px-2 py-0.5 rounded-md text-xs font-medium",
              config.bgColor,
              config.textColor
            )}
          >
            {action.department}
          </span>
        </div>
      </div>

      {/* Contact Methods */}
      {hasContact && (
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          {hasCall && (
            <div
              className="flex items-center gap-1.5 text-xs text-emerald-600 animate-icon-bounce"
              style={{ animationDelay: `${index * 100 + 400}ms` }}
            >
              <Phone className="h-4 w-4" />
              <span className="font-medium">Call</span>
            </div>
          )}
          {hasEmail && (
            <div
              className="flex items-center gap-1.5 text-xs text-blue-600 animate-icon-bounce"
              style={{ animationDelay: `${index * 100 + 450}ms` }}
            >
              <Mail className="h-4 w-4" />
              <span className="font-medium">Email</span>
            </div>
          )}
        </div>
      )}

      {/* No contact indicator */}
      {!hasContact && (
        <div className="text-xs text-muted-foreground pt-2 border-t border-border">
          No immediate contact required
        </div>
      )}
    </div>
  );
}
