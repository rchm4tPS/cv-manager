import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface PopoverSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PopoverSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  className,
  disabled
}: PopoverSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={
          <button 
            disabled={disabled}
            className={cn(
              "flex items-center justify-between w-full h-9 px-3 rounded-md border bg-white text-sm outline-none hover:bg-slate-50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed",
              className
            )} 
          />
        }>
          <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[200px] p-1 z-[10050]">
          <div className="flex flex-col space-y-0.5 max-h-[250px] overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors hover:bg-slate-100",
                  value === opt.value ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600"
                )}
                onClick={() => {
                  onValueChange(opt.value);
                  setOpen(false);
                }}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.value && <Check className="w-4 h-4 ml-2 shrink-0" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
