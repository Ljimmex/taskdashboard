import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import {
    Bold, Italic, List, ListOrdered, CheckSquare,
    Quote, Code, Undo, Redo, Heading1, Heading2
} from 'lucide-react'

interface TiptapEditorProps {
    content: any
    onChange: (content: any) => void
    editable?: boolean
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) return null

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[var(--app-border)] bg-[var(--app-bg-elevated)] sticky top-0 z-10 rounded-t-xl">
            <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('bold') ? 'bg-[var(--app-accent)] text-white' : 'hover:bg-[var(--app-bg-hover)] text-[var(--app-text-muted)]'}`}
                title="Bold"
            >
                <Bold size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('italic') ? 'bg-[var(--app-accent)] text-white' : 'hover:bg-[var(--app-bg-hover)] text-[var(--app-text-muted)]'}`}
                title="Italic"
            >
                <Italic size={18} />
            </button>
            <div className="w-px h-6 bg-[var(--app-border)] mx-1" />
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-[var(--app-accent)] text-white' : 'hover:bg-[var(--app-bg-hover)] text-[var(--app-text-muted)]'}`}
                title="Heading 1"
            >
                <Heading1 size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-[var(--app-accent)] text-white' : 'hover:bg-[var(--app-bg-hover)] text-[var(--app-text-muted)]'}`}
                title="Heading 2"
            >
                <Heading2 size={18} />
            </button>
            <div className="w-px h-6 bg-[var(--app-border)] mx-1" />
            <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('bulletList') ? 'bg-[var(--app-accent)] text-white' : 'hover:bg-[var(--app-bg-hover)] text-[var(--app-text-muted)]'}`}
                title="Bullet List"
            >
                <List size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('orderedList') ? 'bg-[var(--app-accent)] text-white' : 'hover:bg-[var(--app-bg-hover)] text-[var(--app-text-muted)]'}`}
                title="Ordered List"
            >
                <ListOrdered size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('taskList') ? 'bg-[var(--app-accent)] text-white' : 'hover:bg-[var(--app-bg-hover)] text-[var(--app-text-muted)]'}`}
                title="Task List"
            >
                <CheckSquare size={18} />
            </button>
            <div className="w-px h-6 bg-[var(--app-border)] mx-1" />
            <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('blockquote') ? 'bg-[var(--app-accent)] text-white' : 'hover:bg-[var(--app-bg-hover)] text-[var(--app-text-muted)]'}`}
                title="Quote"
            >
                <Quote size={18} />
            </button>
            <button
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={`p-1.5 rounded-md transition-colors ${editor.isActive('code') ? 'bg-[var(--app-accent)] text-white' : 'hover:bg-[var(--app-bg-hover)] text-[var(--app-text-muted)]'}`}
                title="Code"
            >
                <Code size={18} />
            </button>
            <div className="ml-auto flex items-center gap-1">
                <button
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="p-1.5 rounded-md transition-colors hover:bg-[var(--app-bg-hover)] text-[var(--app-text-muted)] disabled:opacity-30"
                    title="Undo"
                >
                    <Undo size={18} />
                </button>
                <button
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="p-1.5 rounded-md transition-colors hover:bg-[var(--app-bg-hover)] text-[var(--app-text-muted)] disabled:opacity-30"
                    title="Redo"
                >
                    <Redo size={18} />
                </button>
            </div>
        </div>
    )
}

export const TiptapEditor = ({ content, onChange, editable = true }: TiptapEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Zacznij pisać...',
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Link.configure({
                openOnClick: false,
            }),
            Image,
        ],
        content: content,
        editable: editable,
        onUpdate: ({ editor }) => {
            onChange(editor.getJSON())
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[500px] p-6 text-[var(--app-text-primary)]',
            },
        },
    })

    return (
        <div className="flex flex-col w-full bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-xl shadow-sm overflow-hidden min-h-[600px]">
            {editable && <MenuBar editor={editor} />}
            <EditorContent editor={editor} className="flex-1 overflow-y-auto custom-scrollbar" />
            <div className="p-2 px-4 border-t border-[var(--app-border)] bg-[var(--app-bg-sub)] flex items-center justify-between">
                <span className="text-[10px] text-[var(--app-text-muted)] uppercase tracking-wider font-semibold">Tiptap Editor</span>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[var(--app-text-muted)]">
                        {editor?.storage.characterCount?.characters?.() || 0} znaków
                    </span>
                </div>
            </div>
        </div>
    )
}
