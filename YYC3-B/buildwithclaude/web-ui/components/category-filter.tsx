'use client'

import { Button } from '@/components/ui/button'
import { type CategoryMetadata } from '@/lib/subagents-types'

interface CategoryFilterProps {
  selectedCategory: string | 'all'
  onCategoryChange: (category: string | 'all') => void
  categories: CategoryMetadata[]
}

export function CategoryFilter({ selectedCategory, onCategoryChange, categories }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selectedCategory === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onCategoryChange('all')}
      >
        All Categories
      </Button>
      {categories.map(({ id, displayName, icon, count }) => (
        <Button
          key={id}
          variant={selectedCategory === id ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange(id)}
        >
          {icon} {displayName} ({count})
        </Button>
      ))}
    </div>
  )
}