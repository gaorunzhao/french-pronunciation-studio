import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

interface SelectOption {
  id: string;
  label: string;
  detail?: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  className?: string;
  status?: string;
  onChange(value: string): void;
}

export function SelectField({
  label,
  value,
  options,
  className,
  status,
  onChange,
}: SelectFieldProps) {
  const selectedOption = options.find((option) => option.id === value) ?? options[0];

  return (
    <label className={className}>
      <span>{label}</span>
      <Select.Root value={value} onValueChange={onChange}>
        <Select.Trigger className="select-trigger" aria-label={label}>
          <Select.Value>{selectedOption?.label ?? "Default"}</Select.Value>
          {status ? <span className="select-status">{status}</span> : null}
          <Select.Icon className="select-icon">
            <ChevronDown aria-hidden="true" size={15} strokeWidth={2.2} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="select-content"
            position="popper"
            sideOffset={6}
            collisionPadding={12}
          >
            <Select.Viewport className="select-viewport">
              {options.map((option) => (
                <Select.Item className="select-item" key={option.id} value={option.id}>
                  <Select.ItemText>
                    <span className="select-item-label">{option.label}</span>
                    {option.detail ? (
                      <span className="select-item-detail">{option.detail}</span>
                    ) : null}
                  </Select.ItemText>
                  <Select.ItemIndicator
                    aria-hidden="true"
                    className="select-item-indicator"
                  >
                    <Check size={14} strokeWidth={2.4} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </label>
  );
}
