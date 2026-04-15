import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, fullWidth = false, options, placeholder, className = '', id, value, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = Boolean(error);
    const hasHelper = Boolean(helperText);

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          value={value ?? ''}
          className={`
            w-full
            border
            ${hasError ? 'border-error' : 'border-gray-300'}
            rounded-lg
            px-3
            py-2
            bg-white
            text-gray-900
            focus:outline-none
            focus:ring-2
            ${hasError ? 'focus:ring-error' : 'focus:ring-primary'}
            focus:border-transparent
            disabled:opacity-50
            disabled:cursor-not-allowed
            ${className}
          `.trim().replace(/\s+/g, ' ')}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${selectId}-error` : hasHelper ? `${selectId}-helper` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {hasError && (
          <p id={`${selectId}-error`} className="mt-1 text-sm text-error">
            {error}
          </p>
        )}

        {hasHelper && !hasError && (
          <p id={`${selectId}-helper`} className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
