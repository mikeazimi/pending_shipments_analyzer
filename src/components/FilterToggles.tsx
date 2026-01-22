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
          className="border-[#c0ccdb] data-[state=checked]:bg-[#3281fd] data-[state=checked]:border-[#3281fd]"
        />
        <Label
          htmlFor="exclude-allocated"
          className="text-sm text-[#263444] cursor-pointer"
        >
          Exclude orders with allocated locations
        </Label>
      </div>

      <div className="flex items-center gap-3">
        <Checkbox
          id="exclude-toted"
          checked={excludeToted}
          onCheckedChange={(checked) => onExcludeTotedChange(checked as boolean)}
          className="border-[#c0ccdb] data-[state=checked]:bg-[#3281fd] data-[state=checked]:border-[#3281fd]"
        />
        <Label
          htmlFor="exclude-toted"
          className="text-sm text-[#263444] cursor-pointer"
        >
          Exclude orders with totes assigned
        </Label>
      </div>
    </div>
  )
}
