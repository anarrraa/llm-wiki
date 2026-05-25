import {
  Article,
  Lightbulb,
  TreeStructure,
  Atom,
  Flask,
  Gear,
  User,
  BookOpen,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

export interface EntityMeta {
  key: string
  label: string
  Icon: Icon
  color: string
}

export const ENTITY_META: EntityMeta[] = [
  { key: 'papers',      label: 'Papers',      Icon: Article,       color: '#60a5fa' },
  { key: 'concepts',    label: 'Concepts',    Icon: Lightbulb,     color: '#a78bfa' },
  { key: 'topics',      label: 'Topics',      Icon: TreeStructure, color: '#34d399' },
  { key: 'ideas',       label: 'Ideas',       Icon: Atom,          color: '#fbbf24' },
  { key: 'experiments', label: 'Experiments', Icon: Flask,         color: '#f87171' },
  { key: 'methods',     label: 'Methods',     Icon: Gear,          color: '#a3e635' },
  { key: 'people',      label: 'People',      Icon: User,          color: '#fb923c' },
  { key: 'foundations', label: 'Foundations', Icon: BookOpen,      color: '#e879f9' },
]
