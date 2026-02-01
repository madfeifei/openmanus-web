import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Copy, Check, Edit2, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface MessageProps {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  onEdit?: (id: string, newContent: string) => void;
  onDelete?: (id: string) => void;
}

export function Message({
  id,
  role,
  content,
  timestamp,
  onEdit,
  onDelete,
}: MessageProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleSaveEdit = () => {
    if (onEdit && editedContent.trim()) {
      onEdit(id, editedContent);
      setIsEditing(false);
      toast.success("Message updated");
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(id);
      toast.success("Message deleted");
    }
  };

  return (
    <div
      className={`group flex gap-4 p-4 rounded-lg transition-colors ${
        role === "user"
          ? "bg-blue-950/30 ml-8"
          : "bg-slate-900/50 mr-8"
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
          role === "user"
            ? "bg-blue-600 text-white"
            : "bg-purple-600 text-white"
        }`}
      >
        {role === "user" ? "U" : "AI"}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full min-h-[100px] p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveEdit}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEdit}
                className="border-slate-700 hover:bg-slate-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  code({ node, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const language = match ? match[1] : "";
                    const inline = props.inline;

                    return !inline && language ? (
                      <div className="relative group/code">
                        <SyntaxHighlighter
                          style={vscDarkPlus as any}
                          language={language}
                          PreTag="div"
                          className="rounded-lg !bg-slate-950 !mt-2 !mb-2"
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(String(children));
                            toast.success("Code copied");
                          }}
                          className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity p-2 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <code
                        className="bg-slate-800 px-1.5 py-0.5 rounded text-sm text-blue-300"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  a({ node, children, ...props }) {
                    return (
                      <a
                        {...props}
                        className="text-blue-400 hover:text-blue-300 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    );
                  },
                  p({ node, children, ...props }) {
                    return (
                      <p className="mb-2 last:mb-0 text-slate-200" {...props}>
                        {children}
                      </p>
                    );
                  },
                  ul({ node, children, ...props }) {
                    return (
                      <ul className="list-disc pl-6 mb-2 text-slate-200" {...props}>
                        {children}
                      </ul>
                    );
                  },
                  ol({ node, children, ...props }) {
                    return (
                      <ol className="list-decimal pl-6 mb-2 text-slate-200" {...props}>
                        {children}
                      </ol>
                    );
                  },
                  h1({ node, children, ...props }) {
                    return (
                      <h1 className="text-2xl font-bold mb-3 text-slate-100" {...props}>
                        {children}
                      </h1>
                    );
                  },
                  h2({ node, children, ...props }) {
                    return (
                      <h2 className="text-xl font-bold mb-2 text-slate-100" {...props}>
                        {children}
                      </h2>
                    );
                  },
                  h3({ node, children, ...props }) {
                    return (
                      <h3 className="text-lg font-bold mb-2 text-slate-100" {...props}>
                        {children}
                      </h3>
                    );
                  },
                  blockquote({ node, children, ...props }) {
                    return (
                      <blockquote
                        className="border-l-4 border-blue-500 pl-4 italic text-slate-300 my-2"
                        {...props}
                      >
                        {children}
                      </blockquote>
                    );
                  },
                  table({ node, children, ...props }) {
                    return (
                      <div className="overflow-x-auto my-2">
                        <table
                          className="min-w-full border border-slate-700 text-slate-200"
                          {...props}
                        >
                          {children}
                        </table>
                      </div>
                    );
                  },
                  th({ node, children, ...props }) {
                    return (
                      <th
                        className="border border-slate-700 px-3 py-2 bg-slate-800 font-semibold text-left"
                        {...props}
                      >
                        {children}
                      </th>
                    );
                  },
                  td({ node, children, ...props }) {
                    return (
                      <td className="border border-slate-700 px-3 py-2" {...props}>
                        {children}
                      </td>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </div>

            {/* Timestamp */}
            <div className="text-xs text-slate-500 mt-2">
              {new Date(timestamp).toLocaleString()}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-slate-900 border-slate-700"
            >
              <DropdownMenuItem
                onClick={handleCopy}
                className="text-slate-200 hover:bg-slate-800 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </DropdownMenuItem>
              {role === "user" && onEdit && (
                <DropdownMenuItem
                  onClick={() => setIsEditing(true)}
                  className="text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-400 hover:bg-slate-800 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
