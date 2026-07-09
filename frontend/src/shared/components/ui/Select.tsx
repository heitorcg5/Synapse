import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'
import { fieldClassName } from './form-styles'

type Props = SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, ...props }: Props) {
  return <select className={cn(fieldClassName, className)} {...props} />
}
