import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export const Divider = ({ theme }: { theme: "light" | "dark" }) => (
    <div className={cn("my-1 h-px w-full", theme === "dark" ? "bg-white/10" : "bg-black/10")} />
);

export const ContextDivider = ({ theme }: { theme: "light" | "dark" }) => (
    <div className={cn("mx-1 h-6 w-px", theme === "dark" ? "bg-white/20" : "bg-gray-200")} />
);

interface ToolButtonProps {
    active?: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    tooltip?: string;
    hasDropdown?: boolean;
    theme?: "light" | "dark";
}

export const ToolButton = ({ active, onClick, icon, tooltip, hasDropdown, theme = "light" }: ToolButtonProps) => (
    <button
        title={tooltip}
        onClick={onClick}
        className={cn(
            "group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all",
            active ? "bg-primary text-primary-foreground shadow-md" : theme === "dark" ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
    >
        {icon}
        {hasDropdown && <ChevronDown size={10} className="absolute bottom-1 right-1 opacity-50" />}
    </button>
);

interface ShapeButtonProps {
    active?: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label?: string;
    theme?: "light" | "dark";
}

export const ShapeButton = ({ active, onClick, icon, label, theme = "light" }: ShapeButtonProps) => (
    <button
        onClick={onClick}
        className={cn(
            "flex flex-col items-center justify-center gap-1.5 rounded-xl p-2.5 transition-all outline-none",
            label ? "min-w-[52px]" : "min-w-[42px]",
            active ? "bg-primary text-primary-foreground shadow-sm font-bold" : theme === "dark" ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        )}
    >
        {icon}
        {label && <span className="text-[10px] font-medium">{label}</span>}
    </button>
);

interface TemplateButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    theme?: "light" | "dark";
}

export const TemplateButton = ({ onClick, icon, label, theme = "light" }: TemplateButtonProps) => (
    <button
        onClick={onClick}
        className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl p-4 transition-all border outline-none",
            theme === "dark" ? "text-white/70 hover:bg-white/10 hover:text-white border-white/10" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-gray-200"
        )}
    >
        {icon}
        <span className="text-xs font-medium">{label}</span>
    </button>
);

export const IconButton = ({ onClick, icon, theme = "light" }: { onClick: () => void; icon: React.ReactNode; theme?: "light" | "dark" }) => (
    <button
        onClick={onClick}
        className={cn(
            "flex items-center justify-center rounded-xl p-2.5 transition-all outline-none",
            theme === "dark" ? "hover:bg-white/10" : "hover:bg-gray-100"
        )}
    >
        {icon}
    </button>
);

interface SmallButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    active?: boolean;
    tooltip?: string;
    theme?: "light" | "dark";
    destructive?: boolean;
}

export const SmallButton = ({ onClick, icon, active, tooltip, theme = "light", destructive }: SmallButtonProps) => (
    <button
        title={tooltip}
        onClick={onClick}
        className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-all outline-none",
            active
                ? "bg-primary/20 text-primary"
                : destructive
                    ? "text-red-500 hover:bg-red-500/10"
                    : theme === "dark"
                        ? "text-white/60 hover:bg-white/10 hover:text-white"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        )}
    >
        {icon}
    </button>
);

export const DropdownPanel = ({ children, theme = "light", position = "right" }: { children: React.ReactNode; theme?: "light" | "dark"; position?: "right" | "top" }) => (
    <div
        className={cn(
            "absolute min-w-[200px] animate-in fade-in slide-in-from-left-2 rounded-2xl shadow-xl duration-200 z-[100]",
            position === "right" ? "left-full top-0 ml-3" : "bottom-full left-0 mb-3",
            theme === "dark" ? "border border-white/10 bg-[#2d2d44]" : "border border-black/5 bg-white"
        )}
    >
        {children}
    </div>
);
