import { useEffect, useRef, useState } from 'react'
import EmailEditor, { type EditorRef, type EmailEditorProps } from 'react-email-editor'
import { FaArrowLeft, FaPlus, FaSave, FaTrash } from 'react-icons/fa'
import { toast } from 'sonner'

interface TemplateMetadata {
  id: string
  name: string
  lastModified: number
  createdAt: number
}

function TemplatesScreen(): React.JSX.Element {
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [templates, setTemplates] = useState<TemplateMetadata[]>([])
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState('Untitled Template')
  const emailEditorRef = useRef<EditorRef>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Load templates on mount
  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async (): Promise<void> => {
    try {
      setIsLoading(true)
      const data = await window.api.getTemplates()
      setTemplates(data)
    } catch (error) {
      toast.error('Failed to load templates')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (id: string): void => {
    setCurrentTemplateId(id)
    setView('editor')
  }

  const handleCreate = (): void => {
    setCurrentTemplateId(null)
    setTemplateName('Untitled Template')
    setView('editor')
  }

  const handleDelete = async (id: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const success = await window.api.deleteTemplate(id)
      if (success) {
        toast.success('Template deleted')
        loadTemplates()
      } else {
        toast.error('Failed to delete template')
      }
    } catch (error) {
      toast.error('Error deleting template')
      console.error(error)
    }
  }

  const handleSave = (): void => {
    if (!emailEditorRef.current?.editor) return

    emailEditorRef.current.editor.saveDesign(async (design) => {
      try {
        const saved = await window.api.saveTemplate({
          id: currentTemplateId || undefined,
          name: templateName,
          json: design
        })

        setCurrentTemplateId(saved.id || null)
        toast.success('Template saved successfully')
        loadTemplates() // Refresh list in background
      } catch (error) {
        toast.error('Failed to save template')
        console.error(error)
      }
    })
  }

  const onReady: EmailEditorProps['onReady'] = async (unlayer) => {
    if (currentTemplateId) {
      try {
        const template = await window.api.getTemplate(currentTemplateId)
        if (template) {
          setTemplateName(template.name)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          unlayer.loadDesign(template.json as any)
        } else {
          toast.error('Template not found')
        }
      } catch (error) {
        toast.error('Failed to load template design')
        console.error(error)
      }
    }
  }

  if (view === 'list') {
    return (
      <div className="h-full w-full bg-background p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-main">Email Templates</h1>
            <p className="text-text-muted mt-2">Manage and edit your email designs</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
          >
            <FaPlus />
            Create New
          </button>
        </div>

        {isLoading ? (
          <div className="text-center text-text-muted py-12">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl">
            <p className="text-text-muted text-lg mb-4">No templates found</p>
            <button
              onClick={handleCreate}
              className="px-4 py-2 text-primary hover:text-primary-hover font-medium"
            >
              Create your first template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-surface border border-slate-700 rounded-lg overflow-hidden hover:border-primary transition-colors group cursor-pointer"
                onClick={() => handleEdit(template.id)}
              >
                <div className="h-40 bg-slate-900 flex items-center justify-center border-b border-slate-700">
                  {/* Placeholder for thumbnail - could implement actual thumbnail generation later */}
                  <div className="text-6xl text-slate-700 group-hover:text-primary/50 transition-colors">
                    ✉️
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-medium text-text-main truncate mb-1">
                    {template.name}
                  </h3>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-xs text-text-muted">
                      {new Date(template.lastModified).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleDelete(template.id, e)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                        title="Delete"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Editor Toolbar */}
      <div className="h-16 border-b border-slate-700 bg-surface px-4 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setView('list')}
            className="p-2 text-text-muted hover:text-text-main hover:bg-slate-700 rounded-full transition-colors"
          >
            <FaArrowLeft />
          </button>
          <div className="h-6 w-px bg-slate-700 mx-2" />
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="bg-transparent text-lg font-medium text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 rounded px-2 py-1 w-64 md:w-96"
            placeholder="Template Name"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors font-medium shadow-lg hover:shadow-primary/20"
          >
            <FaSave />
            Save Template
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 bg-white relative flex flex-col overflow-hidden">
        <EmailEditor
          ref={emailEditorRef}
          onReady={onReady}
          options={{
            appearance: {
              theme: 'dark',
              panels: {
                tools: {
                  dock: 'right'
                }
              }
            }
          }}
          style={{ height: '100%', width: '100%', display: 'flex', flex: 1 }}
          minHeight="calc(100vh - 65px)"
        />
      </div>
    </div>
  )
}

export { TemplatesScreen }
