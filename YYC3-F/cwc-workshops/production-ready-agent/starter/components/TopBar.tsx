"use client";
import { motion } from "motion/react";
import { Compass } from "lucide-react";

export function TopBar() {
  return (
    <motion.header
      initial={{ y: -8 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center rounded-2xl border bg-foreground px-7 py-4 text-background shadow-paper-lg"
    >
      <div className="flex items-center gap-4">
        <Compass className="h-5 w-5 text-primary" strokeWidth={1.5} />
        <div>
          <div className="font-serif text-2xl font-semibold leading-none tracking-tight">
            Deal Desk
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-background/50">
            M&A Research · Claude Managed Agents
          </div>
        </div>
      </div>
    </motion.header>
  );
}
