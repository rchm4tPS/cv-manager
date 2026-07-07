import React, { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export const InlineDatePicker = ({ date, onSelect, className, placeholder = "-" }: { date?: string, onSelect: (dateStr: string) => void, className?: string, placeholder?: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <button className={cn("bg-transparent border border-transparent hover:border-input focus:border-input rounded px-2 py-1 h-8 text-sm text-left flex items-center gap-2 whitespace-nowrap", className)} />
      }>
        <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="flex-1 truncate">{date ? format(new Date(date), "MMM d, yyyy") : placeholder}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[50] max-h-[70vh] overflow-y-auto" align="start">
        <Calendar
          mode="single"
          selected={date ? new Date(date) : undefined}
          disabled={(d) => d > new Date()}
          onSelect={(newDate) => {
            if (newDate) {
              onSelect(newDate.toISOString());
            }
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'saved': return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'applied': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'interviewed': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'offered': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
    default: return 'bg-primary/10 text-primary border-primary/20';
  }
};

export const InlineStatusPicker = ({ status, onSelect }: { status: string, onSelect: (s: string) => void }) => {
  const [open, setOpen] = useState(false);
  
  const options = [
    { value: 'saved', label: 'Saved' },
    { value: 'applied', label: 'Applied' },
    { value: 'interviewed', label: 'Interviewed' },
    { value: 'offered', label: 'Offered' },
    { value: 'rejected', label: 'Rejected' }
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <button className={`flex items-center justify-between gap-2 px-2.5 py-1 rounded-full border outline-none hover:opacity-80 transition-opacity ${getStatusColor(status)}`} />
      }>
        <span className="text-[10px] uppercase font-bold tracking-wider">{status}</span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1.5 z-[50]" align="start">
        <div className="flex flex-col gap-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              className="flex justify-start items-center px-1.5 py-1.5 rounded-sm hover:bg-muted"
              onClick={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
            >
              <span className={`px-2.5 py-1 text-[10px] rounded-full uppercase font-bold tracking-wider border ${getStatusColor(opt.value)}`}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const EditableText = ({ 
  value, 
  onSave, 
  className,
  multiline = false
}: { 
  value: string; 
  onSave: (val: string) => void; 
  className?: string;
  multiline?: boolean;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      if (ref.current.textContent !== value) {
        ref.current.textContent = value;
      }
    }
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={cn(
        "bg-transparent border border-transparent hover:border-input focus:border-input rounded px-2 py-1 text-sm outline-none transition-colors",
        multiline ? "whitespace-normal break-words" : "whitespace-nowrap",
        className
      )}
      onBlur={(e) => {
        const newVal = e.currentTarget.textContent || "";
        if (newVal !== value) onSave(newVal);
      }}
      onKeyDown={(e) => {
        if (!multiline && e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    />
  );
};
