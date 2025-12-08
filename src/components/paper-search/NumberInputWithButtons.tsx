"use client";

import React, { memo } from "react";
import { Plus, Minus } from "lucide-react";

interface NumberInputWithButtonsProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onIncrement: () => void;
  onDecrement: () => void;
  error?: string;
  placeholder?: string;
  showError?: boolean;
}

export const NumberInputWithButtons = memo(
  ({
    id,
    label,
    value,
    onChange,
    onIncrement,
    onDecrement,
    error,
    placeholder,
    showError = true,
  }: NumberInputWithButtonsProps) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium mb-1">
          {label}
        </label>
        <div className="flex items-center">
          <button
            type="button"
            className="h-10 w-10 border rounded-md flex items-center justify-center cursor-pointer dark:active:bg-[#36373e] active:bg-gray-200 aspect-square"
            onClick={onDecrement}
          >
            <Minus className="w-4 h-4" />
          </button>
          <input
            id={id}
            className="mx-2 text-center flex-grow h-10 border rounded-md w-full"
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
          />
          <button
            type="button"
            className="h-10 w-10 border rounded-md flex items-center justify-center cursor-pointer dark:active:bg-[#36373e] active:bg-gray-200 aspect-square"
            onClick={onIncrement}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {showError && error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

NumberInputWithButtons.displayName = "NumberInputWithButtons";
