// components/CustomContextMenu.tsx
'use client'

import * as React from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

export default function CustomContextMenu({
  x,
  y,
  visible,
  onClose,
  barLabel,
}: {
  x: number
  y: number
  visible: boolean
  barLabel: string
  onClose: () => void
}) {
  if (!visible) return null

  return (
    <div
      className="absolute z-50"
      style={{ top: y, left: x }}
      onClick={onClose}
    >
      <ContextMenu open onOpenChange={onClose}>
        <ContextMenuContent className="w-48">
          <div className="px-2 py-1 text-sm font-medium text-muted-foreground">{barLabel}</div>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Stack bar</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem>by product</ContextMenuItem>
              <ContextMenuItem>by state</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSub>
            <ContextMenuSubTrigger>Drill Across</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuSub>
                <ContextMenuSubTrigger>by product</ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem>Individual</ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuSub>
                <ContextMenuSubTrigger>by state</ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem>Individual</ContextMenuItem>
                  <ContextMenuItem>All</ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuItem className="text-red-600">Back</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  )
}
