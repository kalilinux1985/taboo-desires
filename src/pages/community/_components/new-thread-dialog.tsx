import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@/lib/backend/react.tsx";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/backend/api.ts";
import { FORUM_TOPICS, POST_MAX, TITLE_MAX, type ForumTopic } from "@/shared/forum.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { getErrorMessage } from "@/lib/listings.ts";

export default function NewThreadDialog({ defaultTopic }: { defaultTopic?: ForumTopic }) {
  const createThread = useMutation(api.forum.createThread);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<ForumTopic>(defaultTopic ?? "seller_tips");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const valid = title.trim().length >= 3 && body.trim().length > 0;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const id = await createThread({ topic, title, body });
      setOpen(false);
      setTitle("");
      setBody("");
      navigate(`/community/${id}`);
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not post discussion"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && defaultTopic) setTopic(defaultTopic);
      }}
    >
      <DialogTrigger asChild>
        <Button className="cursor-pointer">
          <Plus /> Start a discussion
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Start a discussion</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Topic</Label>
            <Select value={topic} onValueChange={(v) => setTopic(v as ForumTopic)}>
              <SelectTrigger className="w-full cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORUM_TOPICS.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="cursor-pointer">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="thread-title">Title</Label>
            <Input
              id="thread-title"
              maxLength={TITLE_MAX}
              placeholder="Best way to ship discreetly?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="thread-body">Post</Label>
            <Textarea
              id="thread-body"
              rows={6}
              maxLength={POST_MAX}
              placeholder="Share the details..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!valid || saving} className="cursor-pointer">
            {saving && <Spinner />} Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
