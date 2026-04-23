import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className, ...props }: Props) {
  return (
    <textarea
      className={cn(
        'min-h-11 w-full rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#0f0f16] p-3 text-sm text-app-text',
        'placeholder:text-[#6B7280] outline-none transition-all duration-150 ease-in-out',
        'focus:border-[#7C5CFF] focus:shadow-[0_0_0_2px_rgba(124,92,255,0.18)]',
        className,
      )}
      {...props}
    />
  )
}
