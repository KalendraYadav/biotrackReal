import React, { useState, useId } from 'react';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Accessible enterprise Input component conforming to rulebook.md Section 8.2 & 13.7.
 * Always renders a persistent label, links error/helper with aria-describedby,
 * and maintains WCAG 2.2 AA contrast with visible focus ring.
 */
export function Input({
  id: explicitId,
  label,
  helperText,
  error,
  optional = false,
  type = 'text',
  className = '',
  containerClassName = '',
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  disabled = false,
  required = false,
  ...props
}) {
  const generatedId = useId();
  const inputId = explicitId || generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-steel-800 select-none flex items-center gap-1"
          >
            <span>{label}</span>
            {required && <span className="text-biohazard-600" aria-hidden="true">*</span>}
          </label>
          {optional && (
            <span className="text-[11px] text-steel-500 font-normal">
              (optional)
            </span>
          )}
        </div>
      )}

      <div className="relative flex items-center">
        {LeftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-steel-500">
            <LeftIcon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}

        <input
          id={inputId}
          type={effectiveType}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            'w-full h-10 px-3 bg-white text-steel-950 placeholder:text-steel-400 text-sm rounded border transition-colors duration-100',
            'border-steel-300 hover:border-steel-400',
            'focus:outline-none focus:ring-2 focus:ring-forest-700 focus:border-forest-700',
            'disabled:bg-steel-50 disabled:text-steel-400 disabled:border-steel-200 disabled:cursor-not-allowed',
            LeftIcon && 'pl-9',
            (RightIcon || isPassword) && 'pr-9',
            error && 'border-biohazard-600 focus:ring-biohazard-600 focus:border-biohazard-600 text-biohazard-950',
            className
          )}
          {...props}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 p-1 text-steel-400 hover:text-steel-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-700 rounded"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Eye className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        ) : RightIcon ? (
          <div className="absolute right-3 flex items-center pointer-events-none text-steel-500">
            <RightIcon className="w-4 h-4" aria-hidden="true" />
          </div>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} className="flex items-center gap-1 text-xs text-biohazard-700 mt-0.5" role="alert">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-steel-500 mt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export default Input;
