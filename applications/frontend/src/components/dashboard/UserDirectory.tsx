import { useState, useMemo } from "react";
import { Users, Search, Filter, UserPlus, Pencil, Trash2, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface User {
  id: number;
  name: string;
  role: string;
}

interface UserDirectoryProps {
  users: User[] | undefined;
  isLoading: boolean;
  onViewUser?: (userId: number) => void;
  onCreateUser?: () => void;
  onEditUser?: (user: User) => void;
  onDeleteUser?: (userId: number) => void;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-primary/10 text-primary border-primary/20",
  developer: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  ops: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function UserDirectory({ users, isLoading, onViewUser, onCreateUser, onEditUser, onDeleteUser }: UserDirectoryProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const allRoles = useMemo(() => {
    if (!users) return [];
    return [...new Set(users.map(u => u.role))].sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const handleDelete = () => {
    if (deleteId !== null && onDeleteUser) {
      onDeleteUser(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold">User Directory</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {users ? `${filteredUsers.length} of ${users.length} users` : "Search and filter registered users."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-9 bg-muted/20 border-border/30"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-users"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[140px] bg-muted/20 border-border/30" data-testid="select-role-filter">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Role" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {allRoles.map(role => (
                  <SelectItem key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onCreateUser && (
              <Button variant="outline" size="sm" onClick={onCreateUser} className="gap-1.5 border-primary/20 hover:bg-primary/10 hover:border-primary/40">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            )}
          </div>
        </div>
        <div className="px-6 pb-6 flex-1">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border/30 rounded-lg bg-muted/5">
              <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="text-sm font-medium text-foreground">No users found</h3>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block border border-border/30 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow className="border-border/20">
                      <TableHead className="w-[80px]">ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[120px]">Role</TableHead>
                      <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className="cursor-pointer hover:bg-primary/5 border-border/10"
                        onClick={() => onViewUser?.(user.id)}
                        data-testid={`row-user-${user.id}`}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">#{user.id}</TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${ROLE_COLORS[user.role] || "bg-muted/10 text-muted-foreground border-border/20"}`}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10" onClick={() => onViewUser?.(user.id)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10" onClick={() => onEditUser?.(user)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-400 hover:bg-red-500/10" onClick={() => setDeleteId(user.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 border border-border/20 rounded-lg bg-muted/5 flex items-center justify-between cursor-pointer hover:bg-primary/5"
                    onClick={() => onViewUser?.(user.id)}
                    data-testid={`card-user-${user.id}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{user.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">#{user.id}</span>
                    </div>
                    <Badge variant="outline" className={ROLE_COLORS[user.role] || ""}>
                      {user.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
