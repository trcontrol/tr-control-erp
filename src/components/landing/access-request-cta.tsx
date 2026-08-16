import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { getAccessRequestWhatsAppUrl, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type AccessRequestCtaProps = {
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
  showArrow?: boolean;
  children?: ReactNode;
};

/**
 * Preserves current Solicitar acesso behavior:
 * WhatsApp when NEXT_PUBLIC_TR_WHATSAPP_NUMBER is set; otherwise /login.
 */
export function AccessRequestCta({
  size = "default",
  variant = "default",
  className,
  showArrow = false,
  children = "Solicitar acesso",
}: AccessRequestCtaProps) {
  const accessRequestUrl = getAccessRequestWhatsAppUrl();
  const content = (
    <>
      {children}
      {showArrow ? <ArrowRight className="h-4 w-4" /> : null}
    </>
  );

  if (accessRequestUrl) {
    return (
      <Button size={size} variant={variant} className={cn(className)} asChild>
        <a
          href={accessRequestUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {content}
        </a>
      </Button>
    );
  }

  return (
    <Button size={size} variant={variant} className={cn(className)} asChild>
      <Link href={ROUTES.login}>{content}</Link>
    </Button>
  );
}
