"use client";

import React, { memo, useCallback, useMemo } from "react";

interface BaseOption {
  id: string;
  label: string;
}

interface SelectFieldProps<T extends BaseOption> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly T[];
  placeholder?: string;
  error?: string;
  renderOption?: (option: T) => string;
}

function SelectFieldInner<T extends BaseOption>({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  error,
  renderOption,
}: SelectFieldProps<T>) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const renderedOptions = useMemo(
    () =>
      options.map((option) => (
        <option
          key={option.id}
          value={option.id}
          className="dark:bg-[#323339] dark:text-white"
        >
          {renderOption ? renderOption(option) : option.label}
        </option>
      )),
    [options, renderOption]
  );

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {label}
      </label>
      <select
        id={id}
        className="w-full p-2 border rounded-md cursor-pointer"
        value={value}
        onChange={handleChange}
      >
        <option value="" hidden className="dark:bg-[#323339] dark:text-white">
          {placeholder}
        </option>
        {renderedOptions}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export const SelectField = memo(SelectFieldInner) as typeof SelectFieldInner;
