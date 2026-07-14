'use client'

import type { ReactNode } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Undo,
  Redo,
  Heading2,
  Heading3,
  Quote,
  Minus,
} from 'lucide-react'

type LegalRichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export function LegalRichTextEditor({ value, onChange, placeholder }: LegalRichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-sage-600 hover:text-sage-700 underline' },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Text hier eingeben …',
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'legal-content legal-content-editor min-h-[420px] px-4 py-3 focus:outline-none',
      },
    },
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) return null

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Link-Adresse eingeben', previousUrl || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const toolbarButton = (
    active: boolean,
    onClick: () => void,
    icon: ReactNode,
    label: string
  ) => (
    <Button
      type="button"
      size="sm"
      variant={active ? 'secondary' : 'ghost'}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {icon}
    </Button>
  )

  return (
    <div className="border border-sage-200 rounded-lg overflow-hidden bg-white">
      <div className="flex flex-wrap gap-1 border-b border-sage-200 bg-sage-50 p-2">
        {toolbarButton(
          editor.isActive('heading', { level: 2 }),
          () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          <Heading2 className="h-4 w-4" />,
          'Überschrift (groß)'
        )}
        {toolbarButton(
          editor.isActive('heading', { level: 3 }),
          () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          <Heading3 className="h-4 w-4" />,
          'Überschrift (klein)'
        )}
        {toolbarButton(
          editor.isActive('bold'),
          () => editor.chain().focus().toggleBold().run(),
          <Bold className="h-4 w-4" />,
          'Fett'
        )}
        {toolbarButton(
          editor.isActive('italic'),
          () => editor.chain().focus().toggleItalic().run(),
          <Italic className="h-4 w-4" />,
          'Kursiv'
        )}
        {toolbarButton(
          editor.isActive('bulletList'),
          () => editor.chain().focus().toggleBulletList().run(),
          <List className="h-4 w-4" />,
          'Aufzählung'
        )}
        {toolbarButton(
          editor.isActive('orderedList'),
          () => editor.chain().focus().toggleOrderedList().run(),
          <ListOrdered className="h-4 w-4" />,
          'Nummerierte Liste'
        )}
        {toolbarButton(
          editor.isActive('blockquote'),
          () => editor.chain().focus().toggleBlockquote().run(),
          <Quote className="h-4 w-4" />,
          'Hinweis-Box'
        )}
        {toolbarButton(false, setLink, <Link2 className="h-4 w-4" />, 'Link einfügen')}
        {toolbarButton(
          false,
          () => editor.chain().focus().setHorizontalRule().run(),
          <Minus className="h-4 w-4" />,
          'Trennlinie'
        )}
        {toolbarButton(
          false,
          () => editor.chain().focus().undo().run(),
          <Undo className="h-4 w-4" />,
          'Rückgängig'
        )}
        {toolbarButton(
          false,
          () => editor.chain().focus().redo().run(),
          <Redo className="h-4 w-4" />,
          'Wiederholen'
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
