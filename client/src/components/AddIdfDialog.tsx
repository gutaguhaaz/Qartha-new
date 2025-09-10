import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { createIdf } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddIdfDialogProps {
  cluster: string;
  project: string;
  token?: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: (idf: any) => void;
}

export default function AddIdfDialog({
  cluster,
  project,
  token,
  disabled,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onCreated,
}: AddIdfDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [site, setSite] = useState("");
  const [room, setRoom] = useState("");
  const [errors, setErrors] = useState<{ code?: string; title?: string; site?: string }>({});

  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (body: { code: string; title: string; site: string; room?: string }) =>
      createIdf({ cluster, project, body, token }),
    onSuccess: (data) => {
      toast({ title: "Success", description: "IDF created" });
      onCreated?.(data);
      setOpen(false);
      setCode("");
      setTitle("");
      setSite("");
      setRoom("");
      setErrors({});
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim();
    const trimmedTitle = title.trim();
    const trimmedSite = site.trim();
    const trimmedRoom = room.trim();

    const newErrors: { code?: string; title?: string; site?: string } = {};
    if (!trimmedCode) newErrors.code = "Code is required";
    else if (/\s/.test(trimmedCode)) newErrors.code = "Code cannot contain spaces";
    if (!trimmedTitle) newErrors.title = "Title is required";
    if (!trimmedSite) newErrors.site = "Site is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    mutation.mutate({ code: trimmedCode, title: trimmedTitle, site: trimmedSite, room: trimmedRoom || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="sm" disabled={disabled}>
            <Plus className="h-4 w-4 mr-2" /> Add IDF
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add IDF</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="idf-code">Code</Label>
            <Input id="idf-code" value={code} onChange={(e) => setCode(e.target.value)} />
            {errors.code && <p className="text-sm text-destructive mt-1">{errors.code}</p>}
          </div>
          <div>
            <Label htmlFor="idf-title">Title</Label>
            <Input id="idf-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title}</p>}
          </div>
          <div>
            <Label htmlFor="idf-site">Site</Label>
            <Input id="idf-site" value={site} onChange={(e) => setSite(e.target.value)} />
            {errors.site && <p className="text-sm text-destructive mt-1">{errors.site}</p>}
          </div>
          <div>
            <Label htmlFor="idf-room">Room</Label>
            <Input id="idf-room" value={room} onChange={(e) => setRoom(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

