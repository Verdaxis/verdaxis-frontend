import React, { useId } from 'react';
import { VerdaxisSelect } from '../ui/VerdaxisSelect';

const inputClass = 'w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#5DADE2] focus:ring-1 focus:ring-[#5DADE2] disabled:opacity-60';
const labelClass = 'block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 leading-4';
export const gridClass = 'grid gap-4 sm:grid-cols-2';

export function TextField({ label, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
    const id = useId();
    return (
        <div className="space-y-1.5">
            <label className={labelClass} htmlFor={id}>{label}</label>
            <input {...props} id={id} className={inputClass} aria-describedby={hint ? `${id}-hint` : undefined} />
            {hint && <p id={`${id}-hint`} className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
        </div>
    );
}

export function TextAreaField({ label, hint, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
    const id = useId();
    return (
        <div className="space-y-1.5">
            <label className={labelClass} htmlFor={id}>{label}</label>
            <textarea {...props} id={id} rows={3} className={inputClass} aria-describedby={hint ? `${id}-hint` : undefined} />
            {hint && <p id={`${id}-hint`} className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
        </div>
    );
}

export function ChoiceField({ label, value, onChange, options, disabled, name }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    disabled?: boolean;
    name?: string;
}) {
    return (
        <div className="space-y-1.5">
            <span className={labelClass}>{label}</span>
            {name && <input type="hidden" name={name} value={value} />}
            <VerdaxisSelect value={value} onChange={onChange} options={options} ariaLabel={label} disabled={disabled} />
        </div>
    );
}

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <fieldset className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-700">
            <legend className="pr-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</legend>
            {children}
        </fieldset>
    );
}

export function fieldText(data: FormData, name: string): string {
    return String(data.get(name) ?? '').trim();
}

export function optionalNumber(data: FormData, name: string): number | undefined {
    const value = fieldText(data, name);
    return value === '' ? undefined : Number(value);
}

export function localDateTime(value: Date): string {
    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
}

export function singaporeDate(): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Singapore',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}
