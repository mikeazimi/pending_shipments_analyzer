'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface FilterTogglesProps {
  excludeAllocated: boolean
  excludeToted: boolean
  onExcludeAllocatedChange: (value: boolean) => void
  onExcludeTotedChange: (value: boolean) => void
}

export function FilterToggles({
  excludeAllocated,
  excludeToted,
  onExcludeAllocatedChange,
  onExcludeTotedChange,
}: FilterTogglesProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Checkbox
          id="exclude-allocated"
          checked={excludeAllocated}
          onCheckedChange={(checked) => onExcludeAllocatedChange(checked as boolean)}
          className="border-slate-500 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
        />
        <Label
          htmlFor="exclude-allocated"
          className="text-sm text-slate-300 cursor-pointer"
        >
          Exclude orders with allocated locations
        </Label>
      </div>

      <div className="flex items-center gap-3">
        <Checkbox
          id="exclude-toted"
          checked={excludeToted}
          onCheckedChange={(checked) => onExcludeTotedChange(checked as boolean)}
          className="border-slate-500 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
        />
        <Label
          htmlFor="exclude-toted"
          className="text-sm text-slate-300 cursor-pointer"
        >
          Exclude orders with totes assigned
        </Label>
      </div>
    </div>
  )
}
