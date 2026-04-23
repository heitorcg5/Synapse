import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

type ButtonVariant = 'primary' | 'ghost'
type ButtonSize = 'md' | 'sm'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        'border transition-all duration-150 ease-in-out disabled:cursor-not-allowed disabled:opacity-60',
        'enabled:hover:-translate-y-px enabled:active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/60',
        size === 'md' ? 'h-11 px-5 text-sm' : 'px-3 py-2 text-xs',
        variant === 'primary' &&
          'h-11 rounded-[10px] border-brand-purple/70 bg-[linear-gradient(180deg,#8768ff_0%,#7c5cff_100%)] px-5 font-medium text-white shadow-[0_3px_10px_rgba(0,0,0,0.28)] hover:border-brand-purple/80 hover:bg-[linear-gradient(180deg,#9278ff_0%,#8666ff_100%)] hover:shadow-[0_8px_18px_rgba(124,92,255,0.26)] active:shadow-[0_3px_10px_rgba(0,0,0,0.28)]',
        variant === 'ghost' &&
          'rounded-[10px] border-white/15 bg-white/[0.03] font-medium text-app-text shadow-[0_2px_8px_rgba(0,0,0,0.2)] hover:border-white/25 hover:bg-white/[0.06] hover:text-app-text hover:shadow-[0_6px_14px_rgba(0,0,0,0.28)] active:shadow-[0_2px_8px_rgba(0,0,0,0.2)]',
        className,
      )}
      {...props}
    />
  )
}
