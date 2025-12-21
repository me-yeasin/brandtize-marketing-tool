import { useRef } from 'react'
import EmailEditor, { type EditorRef, type EmailEditorProps } from 'react-email-editor'

function TemplatesScreen(): React.JSX.Element {
  const emailEditorRef = useRef<EditorRef>(null)

  const onReady: EmailEditorProps['onReady'] = (unlayer) => {
    // editor is ready
    // You can load your template here;
    // const templateJson = { DESIGN JSON GOES HERE };
    // unlayer.loadDesign(templateJson);
    console.log('Unlayer editor is ready', unlayer)
  }

  return (
    <div className="h-full w-full flex flex-col bg-background p-4">
      <div className="flex-1 bg-white rounded-lg overflow-hidden border border-slate-700 flex flex-col">
        <EmailEditor
          ref={emailEditorRef}
          onReady={onReady}
          options={{ appearance: { theme: 'dark' } }}
          style={{ height: '100%', width: '100%' }}
          minHeight="100%"
        />
      </div>
    </div>
  )
}

export { TemplatesScreen }
