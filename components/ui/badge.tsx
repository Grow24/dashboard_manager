import * as React from "react";

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
};

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "border-transparent bg-blue-600 text-white",
  secondary: "border-transparent bg-gray-200 text-gray-900",
  destructive: "border-transparent bg-red-600 text-white",
  outline: "border border-gray-300 text-gray-900",
};

export function Badge({ children, className = "", variant = "default" }: BadgeProps) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors";
  const variantClass = variantClasses[variant] || variantClasses.default;
  return <span className={`${base} ${variantClass} ${className}`}>{children}</span>;
}