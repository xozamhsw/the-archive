import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface CommonProps {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  icon?: ReactNode;
}

type GlowButtonProps =
  | (CommonProps & {
      href: string;
      onClick?: never;
      disabled?: never;
      type?: never;
    })
  | (CommonProps &
      ButtonHTMLAttributes<HTMLButtonElement> & {
        href?: never;
      });

function getVariantClasses(variant: CommonProps["variant"]) {
  if (variant === "secondary") {
    return "border border-[var(--archive-border-strong)] bg-white/[0.035] text-[var(--archive-text)] hover:bg-white/[0.075]";
  }

  if (variant === "ghost") {
    return "border border-transparent bg-transparent text-[var(--archive-muted)] hover:text-[var(--archive-text)]";
  }

  return "archive-button-primary text-white";
}

export default function GlowButton(props: GlowButtonProps) {
  const {
    children,
    className = "",
    variant = "primary",
    icon,
  } = props;

  const classes = `inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-6 py-3 text-sm font-semibold transition duration-300 active:scale-[0.98] ${getVariantClasses(
    variant,
  )} ${className}`;

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={classes}>
        <span>{children}</span>
        {icon}
      </Link>
    );
  }

  const {
    href: _href,
    icon: _icon,
    variant: _variant,
    className: _className,
    children: _children,
    ...buttonProps
  } = props;

  return (
    <button className={classes} {...buttonProps}>
      <span>{children}</span>
      {icon}
    </button>
  );
}
