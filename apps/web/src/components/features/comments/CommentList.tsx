import React from 'react'

export interface Comment {
    id: string
    author: {
        id: string
        name: string
        avatar?: string
    }
    content: string
    createdAt: string
    mentions?: string[]
    likes?: string[] // Array of user IDs who liked
    parentId?: string | null // For threaded replies
    replies?: Comment[] // Nested comments
}

interface CommentListProps {
    comments: Comment[]
    currentUserId?: string
    onLike?: (commentId: string) => void
    onReply?: (commentId: string, authorName: string) => void
}

const Avatar = ({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) => {
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
    const sizeClass = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'
    return (
        <div className={`${sizeClass} rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-semibold text-black shrink-0`}>
            {initials}
        </div>
    )
}

const HeartIcon = ({ filled, className = '' }: { filled: boolean; className?: string }) => (
    filled ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    )
)

interface CommentItemProps {
    comment: Comment
    currentUserId?: string
    onLike?: (commentId: string) => void
    onReply?: (commentId: string, authorName: string) => void
    depth?: number
}

const CommentItem: React.FC<CommentItemProps> = ({
    comment,
    currentUserId = 'user-1',
    onLike,
    onReply,
    depth = 0
}) => {
    const isLiked = comment.likes?.includes(currentUserId) || false
    const likesCount = comment.likes?.length || 0

    return (
        <div className={`flex gap-3 group transition-all duration-200 ${depth > 0 ? 'ml-10' : ''}`}>
            <Avatar name={comment.author.name} size="md" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">
                        {comment.author.name}
                    </span>
                    <span className="text-[11px] text-gray-500">• {comment.createdAt}</span>
                </div>

                <div className="bg-gray-800/40 rounded-2xl px-4 py-3 border border-gray-700/50 group-hover:border-gray-600/50 group-hover:bg-gray-800/60 transition-all">
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                        {comment.content.split(/(@\w+\s\w+)/g).map((part, i) => {
                            if (part.startsWith('@')) {
                                return <span key={i} className="text-amber-400 font-medium cursor-pointer hover:underline">{part}</span>
                            }
                            return part
                        })}
                    </p>
                </div>

                <div className="flex items-center gap-4 mt-2 px-1">
                    <button
                        onClick={() => onReply?.(comment.id, comment.author.name)}
                        className="text-[11px] font-medium text-gray-500 hover:text-amber-400 transition-colors"
                    >
                        Odpowiedz
                    </button>

                    <button
                        onClick={() => onLike?.(comment.id)}
                        className={`flex items-center gap-1.5 transition-all duration-200 group/like ${isLiked ? 'text-amber-400' : 'text-gray-500 hover:text-amber-400'
                            }`}
                    >
                        <HeartIcon
                            filled={isLiked}
                            className={`transition-transform duration-200 ${isLiked ? 'scale-110' : 'group-hover/like:scale-110'}`}
                        />
                        {likesCount > 0 && (
                            <span className="text-[11px] font-medium">{likesCount}</span>
                        )}
                    </button>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 space-y-4 border-l-2 border-gray-800/50 pl-4">
                        {comment.replies.map((reply) => (
                            <CommentItem
                                key={reply.id}
                                comment={reply}
                                currentUserId={currentUserId}
                                onLike={onLike}
                                onReply={onReply}
                                depth={depth + 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export const CommentList: React.FC<CommentListProps> = ({
    comments,
    currentUserId,
    onLike,
    onReply
}) => {
    if (comments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center mb-4 border border-gray-700">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                </div>
                <h4 className="text-sm font-medium text-gray-300">Brak komentarzy</h4>
                <p className="text-xs text-gray-500 mt-1">Bądź pierwszym, który skomentuje to zadanie.</p>
            </div>
        )
    }

    // Build comment tree from flat array
    const buildTree = (flatComments: Comment[]) => {
        const commentMap: Record<string, Comment & { replies: Comment[] }> = {}
        const tree: Comment[] = []

        flatComments.forEach(comment => {
            commentMap[comment.id] = { ...comment, replies: [] }
        })

        flatComments.forEach(comment => {
            const mappedComment = commentMap[comment.id]
            if (comment.parentId && commentMap[comment.parentId]) {
                commentMap[comment.parentId].replies.push(mappedComment)
            } else {
                tree.push(mappedComment)
            }
        })

        return tree
    }

    const commentTree = buildTree(comments)

    return (
        <div className="space-y-6 pb-20">
            {commentTree.map((comment) => (
                <CommentItem
                    key={comment.id}
                    comment={comment}
                    currentUserId={currentUserId}
                    onLike={onLike}
                    onReply={onReply}
                />
            ))}
        </div>
    )
}
