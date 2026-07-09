import type { ReactNode } from 'react'
import { fieldLabelClassName } from './form-styles'

type Props = {
  label: string
  children: ReactNode
}

export function FilterField({ label, children }: Props) {
  return (
    <label className="flex min-w-0 flex-col gap-[0.35rem]">
      <span className={fieldLabelClassName}>{label}</span>
      {children}
    </label>
  )
}
