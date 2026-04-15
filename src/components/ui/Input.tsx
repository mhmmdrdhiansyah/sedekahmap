import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, fullWidth = false, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const hasError = Boolean(error);
    const hasHelper = Boolean(helperText);

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
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
          aria-describedby={hasError ? `${inputId}-error` : hasHelper ? `${inputId}-helper` : undefined}
          {...props}
        />

        {hasError && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-error">
            {error}
          </p>
        )}

        {hasHelper && !hasError && (
          <p id={`${inputId}-helper`} className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
