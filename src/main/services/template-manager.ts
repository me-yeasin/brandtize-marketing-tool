import { randomUUID } from 'crypto'
import { app } from 'electron'
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface EmailTemplate {
  id: string
  name: string
  thumbnail?: string // Optional base64 thumbnail
  json: Record<string, unknown> // Unlayer design JSON
  html?: string // Optional compiled HTML
  lastModified: number
  createdAt: number
}

// Lightweight metadata for list view
export interface TemplateMetadata {
  id: string
  name: string
  lastModified: number
  createdAt: number
}

class TemplateManager {
  private templatesDir: string

  constructor() {
    this.templatesDir = join(app.getPath('userData'), 'templates')
    this.ensureDirectory()
  }

  private ensureDirectory(): void {
    if (!existsSync(this.templatesDir)) {
      mkdirSync(this.templatesDir, { recursive: true })
    }
  }

  private getFilePath(id: string): string {
    return join(this.templatesDir, `${id}.json`)
  }

  getAllMetadata(): TemplateMetadata[] {
    this.ensureDirectory()
    const files = readdirSync(this.templatesDir).filter((file) => file.endsWith('.json'))

    const templates: TemplateMetadata[] = []

    for (const file of files) {
      try {
        const content = readFileSync(join(this.templatesDir, file), 'utf-8')
        const data = JSON.parse(content) as EmailTemplate
        templates.push({
          id: data.id,
          name: data.name,
          lastModified: data.lastModified,
          createdAt: data.createdAt
        })
      } catch (error) {
        console.error(`Failed to read template ${file}:`, error)
      }
    }

    // Sort by last modified descending
    return templates.sort((a, b) => b.lastModified - a.lastModified)
  }

  getTemplate(id: string): EmailTemplate | null {
    const filePath = this.getFilePath(id)
    if (!existsSync(filePath)) {
      return null
    }

    try {
      const content = readFileSync(filePath, 'utf-8')
      return JSON.parse(content) as EmailTemplate
    } catch (error) {
      console.error(`Failed to load template ${id}:`, error)
      return null
    }
  }

  saveTemplate(
    template: Omit<EmailTemplate, 'lastModified' | 'createdAt'> & {
      id?: string
      createdAt?: number
    }
  ): EmailTemplate {
    const id = template.id || randomUUID()
    const now = Date.now()

    const fullTemplate: EmailTemplate = {
      ...template,
      id,
      createdAt: template.createdAt || now,
      lastModified: now
    }

    writeFileSync(this.getFilePath(id), JSON.stringify(fullTemplate, null, 2), 'utf-8')
    return fullTemplate
  }

  deleteTemplate(id: string): boolean {
    const filePath = this.getFilePath(id)
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath)
        return true
      } catch (error) {
        console.error(`Failed to delete template ${id}:`, error)
        return false
      }
    }
    return false
  }
}

export const templateManager = new TemplateManager()
