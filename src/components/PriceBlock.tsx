"use client";

import { BadgePercent } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import { formatCurrency } from "@/lib/utils";

export function PriceBlock({
  mrp,
  offered,
  compact = false
}: {
  mrp: number;
  offered: number | null;
  compact?: boolean;
}) {
  const { role } = useAuth();
  const canSeeOffer = role === "salesman" || role === "admin";

  return (
    <div className={compact ? "price-block price-block-compact" : "price-block"}>
      <div>
        <span className="price-label">MRP</span>
        <strong className={canSeeOffer && offered ? "mrp-muted" : undefined}>{formatCurrency(mrp)}</strong>
      </div>
      {canSeeOffer && offered ? (
        <div className="offer-price">
          <BadgePercent size={16} aria-hidden="true" />
          <span>
            <small>Offered</small>
            <strong>{formatCurrency(offered)}</strong>
          </span>
        </div>
      ) : null}
    </div>
  );
}

