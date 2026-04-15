import { useState, useEffect } from "react";
import { UserPlus, Pencil, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserFormData {
  name: string;
  email: string;
  role: string;
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: UserFormData;
  onSubmit: (data: UserFormData) => void;
  isPending?: boolean;
}

export default function UserFormDialog({ open, onOpenChange, mode, initialData, onSubmit, isPending }: UserFormDialogProps) {
  const [form, setForm] = useState<UserFormData>({
    name: "",
    email: "",
    role: "developer",
  });

  useEffect(() => {
    if (open && initialData) {
      setForm(initialData);
    } else if (open && mode === "create") {
      setForm({ name: "", email: "", role: "developer" });
    }
  }, [open, initialData, mode]);

  const handleSubmit = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "create" ? <UserPlus className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
            {mode === "create" ? "Add User" : "Edit User"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Create a new user account" : "Update user information"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="user@devops-harness.io"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="ops">Ops</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !form.name.trim() || !form.email.trim()} className="gap-2">
            <Check className="h-4 w-4" />
            {mode === "create" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
