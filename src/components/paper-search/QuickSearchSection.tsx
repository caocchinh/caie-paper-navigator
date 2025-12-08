"use client";

import React, { memo, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GlowEffect } from "@/components/ui/glow-effect";
import { Search } from "lucide-react";

interface QuickSearchSectionProps {
  quickCode: string;
  onQuickCodeChange: (value: string) => void;
  onSubmit: () => void;
  error: string;
}

export const QuickSearchSection = memo(
  forwardRef<HTMLInputElement, QuickSearchSectionProps>(
    ({ quickCode, onQuickCodeChange, onSubmit, error }, ref) => {
      const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSubmit();
        }
      };

      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onQuickCodeChange(e.target.value.toUpperCase());
      };

      const isDisabled = !!error || quickCode === "";

      return (
        <div className="space-y-3 mb-5 h-full border-2 p-5 rounded-sm relative">
          <Label htmlFor="quick-code" className="text-sm text-red-500">
            Quick Paper Code
          </Label>
          <div className="flex justify-center gap-2 h-full">
            <Input
              id="quick-code"
              placeholder="e.g. 9702/42/M/J/20"
              value={quickCode}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className={`max-w-md text-center ${
                error ? "border-red-500" : ""
              }`}
              ref={ref}
            />
            <div className="h-full relative">
              <GlowEffect
                colors={["#FF5733", "#33FF57", "#3357FF", "#F1C40F"]}
                mode="colorShift"
                blur="soft"
                duration={3}
              />
              <Button
                onClick={onSubmit}
                className={`cursor-pointer h-full relative z-10 ${
                  isDisabled ? "opacity-50" : ""
                }`}
                disabled={isDisabled}
              >
                Find
                <Search className="w-4 h-4 ml" />
              </Button>
            </div>
          </div>
          {error ? (
            <p className="text-xs text-red-500">{error}</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                <span className="font-bold">Enter code in format: </span>
                [Subject Code]/[Paper Number]/[Season]/[Year]
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-bold">Tip:</span> Press enter twice to
                access the marking scheme quickly
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-bold">Note:</span> Using quick search will
                update the manual input fields
              </p>
            </>
          )}
        </div>
      );
    }
  )
);

QuickSearchSection.displayName = "QuickSearchSection";
