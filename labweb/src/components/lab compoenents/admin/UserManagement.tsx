import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter as UIDialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, User, Lock, Mail, UserCog, X, Eye, EyeOff } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

function getModulePermission(moduleName: string): { view: boolean; edit: boolean; delete: boolean } {
  try {
    const roleRaw = typeof window !== 'undefined' ? window.localStorage.getItem('role') : null;
    const role = String(roleRaw || '').trim().toLowerCase();
    const isAdmin = new Set(['admin', 'administrator', 'lab supervisor', 'lab-supervisor', 'supervisor']).has(role);
    if (isAdmin) {
      return { view: true, edit: true, delete: true };
    }
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('permissions') : null;
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) {
      return { view: true, edit: true, delete: true };
    }

    const wanted = String(moduleName || '').trim().toLowerCase();
    const found = parsed.find((p: any) => String(p?.name || '').trim().toLowerCase() === wanted);
    if (!found) {
      return { view: true, edit: false, delete: false };
    }
    return {
      view: !!found.view,
      edit: !!found.edit,
      delete: !!found.delete,
    };
  } catch {
    return { view: true, edit: true, delete: true };
  }
}

type UserRole = string;

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  lastLogin: string;
}

interface Permission {
  id: string;
  name: string;
  view: boolean;
  edit: boolean;
  delete: boolean;
}

interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

// Modules available for permissions
const PERMISSION_MODULES: string[] = [
  'Dashboard',
  'Test Catalog',
  'Sample Intake',
  'Samples',
  'Sample Tracking',
  'Barcodes',
  'Result Entry',
  'Report Designer',
  'Report Generator',
  'Inventory',
  'Suppliers',
  'Staff Attendance',
  'User Management',
  'Notifications',
  'Settings',
  'Finance',
  'Financial Ledger',
  'Expenses',
];

const UserManagement: React.FC = () => {
  const { toast } = useToast();
  const modulePerm = getModulePermission('User Management');
  // State for users, roles and per-user permissions
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(''); // holds selected user id in User Permissions section
  const [userPermissions, setUserPermissions] = useState<Record<string, Permission[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [roleError, setRoleError] = useState<string>('');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: (() => void) | null;
  }>({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Confirm',
    onConfirm: null,
  });
  
  // State for modals
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Form states
  const [userForm, setUserForm] = useState<Partial<User> & { password: string }>({ 
    name: '', 
    email: '', 
    role: '',
    password: '',
    status: 'Active'
  });

  // Fetch initial data from localStorage instead of mock arrays
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const [usersResp, rolesResp] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/roles'),
        ]);

        if (cancelled) return;

        const fetchedUsers: User[] = Array.isArray(usersResp.data)
          ? usersResp.data.map((u: any) => ({
              id: String(u._id || u.id || ''),
              name: String(u.name || ''),
              email: String(u.email || ''),
              role: String(u.role || ''),
              status: (String(u.status || 'Active') as any) === 'Inactive' ? 'Inactive' : 'Active',
              lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '',
            }))
          : [];

        const fetchedRoles: Role[] = Array.isArray(rolesResp.data)
          ? rolesResp.data.map((r: any) => ({
              id: String(r._id || r.id || ''),
              name: String(r.name || ''),
              permissions: Array.isArray(r.permissions)
                ? r.permissions.map((p: any, idx: number) => ({
                    id: `${r._id || r.id}-${idx}-${p?.name || idx}`,
                    name: String(p?.name || ''),
                    view: !!p?.view,
                    edit: !!p?.edit,
                    delete: !!p?.delete,
                  }))
                : [],
            }))
          : [];

        const fetchedUserPermissions: Record<string, Permission[]> = {};
        if (Array.isArray(usersResp.data)) {
          for (const u of usersResp.data) {
            const uid = String(u._id || u.id || '');
            if (!uid) continue;
            fetchedUserPermissions[uid] = Array.isArray(u.permissions)
              ? u.permissions.map((p: any, idx: number) => ({
                  id: `${uid}-${idx}-${p?.name || idx}`,
                  name: String(p?.name || ''),
                  view: !!p?.view,
                  edit: !!p?.edit,
                  delete: !!p?.delete,
                }))
              : [];
          }
        }

        setUsers(fetchedUsers);
        setRoles(fetchedRoles);
        setUserPermissions(fetchedUserPermissions);
        setSelectedRoleId('');
      } catch (error) {
        console.error('Error loading user/role data:', error);
        setUsers([]);
        setRoles([]);
        setUserPermissions({});
        setSelectedRoleId('');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist users and roles to localStorage whenever they change so they act as mock data
  useEffect(() => {
    // no-op (backend-driven)
  }, [users, roles]);

  // Handle user form changes
  const handleUserFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle permission toggle
  const handlePermissionToggle = (permissionId: string, field: 'view' | 'edit' | 'delete') => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for User Management.', variant: 'destructive' });
      return;
    }
    setRoles(prevRoles => {
      return prevRoles.map(role => {
        if (role.id === selectedRoleId) {
          return {
            ...role,
            permissions: role.permissions.map(permission => {
              if (permission.id === permissionId) {
                return { ...permission, [field]: !permission[field] };
              }
              return permission;
            })
          };
        }
        return role;
      });
    });
  };

  // Handle toggles directly in the User Permissions table (per-user)
  const handleUserPermissionToggle = (userId: string, permissionName: string, field: 'view' | 'edit' | 'delete') => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for User Management.', variant: 'destructive' });
      return;
    }
    setUserPermissions(prev => {
      const existing = prev[userId] || [];
      const found = existing.find((p) => p.name === permissionName);

      if (found) {
        return {
          ...prev,
          [userId]: existing.map((p) =>
            p.name === permissionName ? { ...p, [field]: !p[field] } : p
          ),
        };
      }

      return {
        ...prev,
        [userId]: [
          ...existing,
          {
            id: `${userId}-${permissionName}`,
            name: permissionName,
            view: field === 'view',
            edit: field === 'edit',
            delete: field === 'delete',
          },
        ],
      };
    });
  };

  // Handle user form submission
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for User Management.', variant: 'destructive' });
      return;
    }

    try {
      if (userForm.id) {
        const resp = await api.put(`/admin/users/${userForm.id}`,
          {
            name: userForm.name,
            email: userForm.email,
            role: userForm.role,
            status: userForm.status,
          }
        );
        const u = resp.data;
        const updatedUser: User = {
          id: String(u._id || userForm.id),
          name: String(u.name || ''),
          email: String(u.email || ''),
          role: String(u.role || ''),
          status: (String(u.status || 'Active') as any) === 'Inactive' ? 'Inactive' : 'Active',
          lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '',
        };
        setUsers(prevUsers => prevUsers.map(user => user.id === updatedUser.id ? updatedUser : user));
      } else {
        const resp = await api.post('/admin/users',
          {
            name: userForm.name,
            email: userForm.email,
            role: userForm.role || 'Lab Technician',
            password: userForm.password,
            status: userForm.status || 'Active',
          }
        );
        const u = resp.data;
        const newUser: User = {
          id: String(u._id),
          name: String(u.name || ''),
          email: String(u.email || ''),
          role: String(u.role || ''),
          status: (String(u.status || 'Active') as any) === 'Inactive' ? 'Inactive' : 'Active',
          lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '',
        };
        setUsers(prevUsers => [newUser, ...prevUsers]);
      }

      setRoleError('');
      // Reset form and close modal (no auto-filled values)
      setUserForm({ name: '', email: '', role: '', password: '', status: 'Active' });
      setIsUserModalOpen(false);
    } catch (e) {
      const err: any = e;
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || 'Failed to save user';
      setRoleError(status ? `${status}: ${message}` : String(message));
      console.error('Failed to save user', e);
    }
    
  };

  // State for role form
  const [roleForm, setRoleForm] = useState<Partial<Role> & { name: string }>({ 
    id: '',
    name: '',
    permissions: []
  });

  // Handle role form changes
  const handleRoleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRoleForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle role form submission (persist permissions)
  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for User Management.', variant: 'destructive' });
      return;
    }

    try {
      // If permissions modal is used for a user, persist user permissions instead of roles
      if (selectedUser && !roleForm.id) {
        const payload = (roleForm.permissions || []).map((p: any) => ({
          name: p.name,
          view: !!p.view,
          edit: !!p.edit,
          delete: !!p.delete,
        }));
        const resp = await api.put(`/admin/users/${selectedUser.id}/permissions`, { permissions: payload });
        const updated = resp.data;
        setUserPermissions(prev => ({
          ...prev,
          [selectedUser.id]: (Array.isArray(updated.permissions) ? updated.permissions : []).map((p: any, idx: number) => ({
            id: `${updated._id}-${idx}-${p.name}`,
            name: String(p.name || ''),
            view: !!p.view,
            edit: !!p.edit,
            delete: !!p.delete,
          })),
        }));
      } else {
        // Persist role permissions
        const permsPayload = (roleForm.permissions || []).map((p: any) => ({
          name: p.name,
          view: !!p.view,
          edit: !!p.edit,
          delete: !!p.delete,
        }));

        if (roleForm.id) {
          const resp = await api.put(`/admin/roles/${roleForm.id}`, {
            name: roleForm.name || '',
            permissions: permsPayload,
          });
          const r = resp.data;
          setRoles(prev => prev.map(role => role.id === roleForm.id ? {
            id: String(r._id),
            name: String(r.name || ''),
            permissions: Array.isArray(r.permissions)
              ? r.permissions.map((p: any, idx: number) => ({
                  id: `${r._id}-${idx}`,
                  name: String(p.name || ''),
                  view: !!p.view,
                  edit: !!p.edit,
                  delete: !!p.delete,
                }))
              : [],
          } : role));
        } else {
          const resp = await api.post('/admin/roles', {
            name: roleForm.name || 'New Role',
            permissions: permsPayload,
          });
          const r = resp.data;
          const newRole: Role = {
            id: String(r._id),
            name: String(r.name || ''),
            permissions: Array.isArray(r.permissions)
              ? r.permissions.map((p: any, idx: number) => ({
                  id: `${r._id}-${idx}`,
                  name: String(p.name || ''),
                  view: !!p.view,
                  edit: !!p.edit,
                  delete: !!p.delete,
                }))
              : [],
          };
          setRoles(prev => [...prev, newRole]);
          if (isUserModalOpen) {
            setUserForm(prev => ({
              ...prev,
              role: newRole.name as UserRole,
            }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to save role/permissions:', err);
    }

    setRoleForm({ id: '', name: '', permissions: [] });
    setIsRoleModalOpen(false);
  };

  // Handle role deletion
  const handleDeleteRole = async (roleId: string) => {
    if (!modulePerm.delete) {
      toast({ title: 'Not allowed', description: "You don't have delete permission for User Management.", variant: 'destructive' });
      return;
    }
    try {
      await api.delete(`/admin/roles/${roleId}`);
      setRoles(prevRoles => prevRoles.filter(role => role.id !== roleId));
      setRoleError('');
    } catch (e) {
      const err: any = e;
      const status = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || 'Failed to delete role';
      setRoleError(status ? `${status}: ${message}` : String(message));
      console.error('Failed to delete role', e);
    }
  };

  const requestDeleteRole = (role: Role) => {
    if (!modulePerm.delete) {
      toast({ title: 'Not allowed', description: "You don't have delete permission for User Management.", variant: 'destructive' });
      return;
    }
    setConfirmDialog({
      open: true,
      title: 'Delete Role',
      description: `Are you sure you want to delete ${role.name}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        handleDeleteRole(role.id);
      },
    });
  };

  const requestDeleteUser = (user: User) => {
    if (!modulePerm.delete) {
      toast({ title: 'Not allowed', description: "You don't have delete permission for User Management.", variant: 'destructive' });
      return;
    }
    setConfirmDialog({
      open: true,
      title: 'Delete User',
      description: `Are you sure you want to delete ${user.name}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: () => {
        (async () => {
          try {
            await api.delete(`/admin/users/${user.id}`);
            setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
            setUserPermissions(prev => {
              const next = { ...prev };
              delete next[user.id];
              return next;
            });
            if (selectedRoleId === user.id) {
              setSelectedRoleId('');
            }
            setRoleError('');
          } catch (e) {
            const err: any = e;
            const status = err?.response?.status;
            const message = err?.response?.data?.message || err?.message || 'Failed to delete user';
            setRoleError(status ? `${status}: ${message}` : String(message));
            console.error('Failed to delete user', e);
          }
        })();
      },
    });
  };

  // Handle permission toggle for role form
  const handleRolePermissionToggle = (permissionName: string, field: 'view' | 'edit' | 'delete') => {
    if (!modulePerm.edit) {
      toast({ title: 'Not allowed', description: 'You only have view permission for User Management.', variant: 'destructive' });
      return;
    }
    setRoleForm(prev => {
      const permissions = [...(prev.permissions || [])];
      const existingPermission = permissions.find(p => p.name === permissionName);
      
      if (existingPermission) {
        return {
          ...prev,
          permissions: permissions.map(p => 
            p.name === permissionName 
              ? { ...p, [field]: !p[field] }
              : p
          )
        };
      } else {
        return {
          ...prev,
          permissions: [
            ...permissions,
            { 
              id: `role-${permissionName}`,
              name: permissionName,
              view: field === 'view',
              edit: field === 'edit',
              delete: field === 'delete'
            }
          ]
        };
      }
    });
  };

  // Get current user context and permissions for the User Permissions section
  const selectedUser = users.find(user => user.id === selectedRoleId);
  const currentUserPermissions = selectedUser ? (userPermissions[selectedUser.id] || []) : [];
  const hasUserPermissionsConfig = !!(selectedUser && userPermissions[selectedUser.id]);
  const currentUserPermissionsFull: Permission[] = selectedUser
    ? PERMISSION_MODULES.map((moduleName) => {
        const existing = currentUserPermissions.find((p) => p.name === moduleName);
        return (
          existing || {
            id: `${selectedUser.id}-${moduleName}`,
            name: moduleName,
            view: false,
            edit: false,
            delete: false,
          }
        );
      })
    : [];

  const roleOptions: string[] = Array.from(new Set(roles.map((r) => r.name).filter(Boolean)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Role Management Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Role Management</CardTitle>
            <CardDescription>Create and view available roles</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="new-role-name">Role Name</Label>
              <Input
                id="new-role-name"
                placeholder="Enter role name"
                value={roleForm.name}
                onChange={handleRoleFormChange}
                name="name"
              />
            </div>
            <Button
              type="button"
              className="sm:w-auto w-full mt-2 sm:mt-0"
              disabled={!modulePerm.edit}
              onClick={async () => {
                if (!modulePerm.edit) {
                  toast({ title: 'Not allowed', description: 'You only have view permission for User Management.', variant: 'destructive' });
                  return;
                }
                const trimmedName = (roleForm.name || '').trim();
                if (!trimmedName) return;
                try {
                  const res = await api.post('/admin/roles', { name: trimmedName, permissions: [] });
                  const r = res.data;
                  const newRole: Role = {
                    id: String(r._id),
                    name: String(r.name || trimmedName),
                    permissions: Array.isArray(r.permissions)
                      ? r.permissions.map((p: any, idx: number) => ({
                          id: `${r._id}-${idx}`,
                          name: String(p.name || ''),
                          view: !!p.view,
                          edit: !!p.edit,
                          delete: !!p.delete,
                        }))
                      : [],
                  };
                  setRoles(prev => [...prev, newRole]);

                  if (isUserModalOpen) {
                    setUserForm(prev => ({
                      ...prev,
                      role: newRole.name as UserRole,
                    }));
                  }

                  setRoleForm(prev => ({ ...prev, id: '', name: '', permissions: [] }));
                } catch (e) {
                  console.error('Failed to create role', e);
                }
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Role
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Existing Roles</Label>
            {roleError ? (
              <div className="text-sm text-red-600">{roleError}</div>
            ) : null}
            <div className="border rounded-lg p-4 space-y-2 max-h-40 overflow-y-auto">
              {roles.length > 0 ? (
                roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-2 rounded border border-dashed"
                  >
                    <span className="font-medium text-sm">{role.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Role</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:bg-red-100 hover:text-red-700"
                        disabled={!modulePerm.delete}
                        onClick={() => requestDeleteRole(role)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete role</span>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No roles yet. Add a role to get started.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage system users and their permissions</CardDescription>
          </div>
          <Button
            onClick={() => {
              if (!modulePerm.edit) {
                toast({ title: 'Not allowed', description: 'You only have view permission for User Management.', variant: 'destructive' });
                return;
              }
              // Open Add User with empty fields (no auto-filled values)
              setUserForm({ name: '', email: '', role: '', password: '', status: 'Active' });
              setIsUserModalOpen(true);
            }}
            disabled={!modulePerm.edit}
          >
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'Lab Supervisor' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className={`h-2.5 w-2.5 rounded-full mr-2 ${user.status === 'Active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      {user.status}
                    </div>
                  </TableCell>
                  <TableCell>{user.lastLogin}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="mr-2 hover:bg-blue-100"
                      disabled={!modulePerm.edit}
                      onClick={() => {
                        if (!modulePerm.edit) {
                          toast({ title: 'Not allowed', description: 'You only have view permission for User Management.', variant: 'destructive' });
                          return;
                        }
                        // Set the form with user data for editing
                        setUserForm({
                          id: user.id,
                          name: user.name,
                          email: user.email,
                          role: user.role,
                          status: user.status,
                          password: '' // Don't show password for security
                        });
                        setIsUserModalOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit user</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:bg-red-100 hover:text-red-700"
                      disabled={!modulePerm.delete}
                      onClick={() => requestDeleteUser(user)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete user</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Users & Permissions Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>User Permissions</CardTitle>
              <CardDescription>Manage user-specific permissions</CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <Select 
                value={selectedRoleId} 
                onValueChange={(value) => {
                  setSelectedRoleId(value);
                  // Find the selected user and update the form
                  const selectedUser = users.find(user => user.id === value);
                  if (selectedUser) {
                    setUserForm({
                      ...userForm,
                      id: selectedUser.id,
                      name: selectedUser.name,
                      email: selectedUser.email,
                      role: selectedUser.role,
                      status: selectedUser.status
                    });
                  }
                }}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        <span>{user.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={() => {
                  if (!modulePerm.edit) {
                    toast({ title: 'Not allowed', description: 'You only have view permission for User Management.', variant: 'destructive' });
                    return;
                  }
                  // Initialize dialog with current user's permissions so it matches the table
                  const permissionsForUser = selectedUser ? (userPermissions[selectedUser.id] || []) : [];
                  setRoleForm({ id: '', name: '', permissions: permissionsForUser });
                  setIsRoleModalOpen(true);
                }}
                disabled={!modulePerm.edit || !selectedUser}
              >
                <UserCog className="mr-2 h-4 w-4" /> Manage Permission
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasUserPermissionsConfig && (
            <div className="space-y-6">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Module</TableHead>
                      <TableHead className="text-center">View</TableHead>
                      <TableHead className="text-center">Edit</TableHead>
                      <TableHead className="text-center">Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentUserPermissionsFull.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell className="font-medium">{permission.name}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={permission.view}
                            onCheckedChange={() => selectedUser && handleUserPermissionToggle(selectedUser.id, permission.name, 'view')}
                            disabled={!modulePerm.edit}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={permission.edit}
                            onCheckedChange={() => selectedUser && handleUserPermissionToggle(selectedUser.id, permission.name, 'edit')}
                            disabled={!modulePerm.edit || !permission.view}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={permission.delete}
                            onCheckedChange={() => selectedUser && handleUserPermissionToggle(selectedUser.id, permission.name, 'delete')}
                            disabled={!modulePerm.edit || !permission.view || !permission.edit}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={!modulePerm.edit}
                  onClick={() => {
                    if (!modulePerm.edit) {
                      toast({ title: 'Not allowed', description: 'You only have view permission for User Management.', variant: 'destructive' });
                      return;
                    }
                    toast({ title: 'Saved', description: 'Permissions are saved as you toggle them.' });
                  }}
                >
                  Save Permissions
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Role Modal (same layout style as Barcodes view dialog) */}
      <Dialog
        open={isRoleModalOpen}
        onOpenChange={(open) => {
          if (open && !modulePerm.edit) {
            toast({ title: 'Not allowed', description: 'You only have view permission for User Management.', variant: 'destructive' });
            return;
          }
          setIsRoleModalOpen(open);
          if (!open) {
            setRoleForm({ id: '', name: '', permissions: [] });
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <form onSubmit={handleRoleSubmit} className="flex flex-col min-h-0">
            <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
              <div className="space-y-1 text-left">
                <DialogTitle>{roleForm.id ? 'Edit Permission' : 'Add New Permission'}</DialogTitle>
                <DialogDescription>
                  Configure permissions and access levels.
                </DialogDescription>
                {selectedUser && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Manage Permission for: <span className="font-medium">{selectedUser.name}</span>{' '}
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ml-1">
                      {selectedUser.role}
                    </span>
                  </div>
                )}
              </div>
            </DialogHeader>

            <CardContent className="space-y-6 overflow-y-auto p-6">
                <div className="space-y-2 hidden">
                  <Label htmlFor="roleName">Role Name</Label>
                  <Input
                    id="roleName"
                    name="name"
                    value={roleForm.name}
                    onChange={handleRoleFormChange}
                    placeholder="Enter role name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">Module</TableHead>
                          <TableHead className="text-center">View</TableHead>
                          <TableHead className="text-center">Edit</TableHead>
                          <TableHead className="text-center">Delete</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {PERMISSION_MODULES.map((module) => {
                          const permission = roleForm.permissions?.find(p => p.name === module) || {
                            view: false,
                            edit: false,
                            delete: false
                          };
                          
                          return (
                            <TableRow key={module}>
                              <TableCell className="font-medium">{module}</TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={permission.view}
                                  onCheckedChange={() => handleRolePermissionToggle(module, 'view')}
                                  disabled={!modulePerm.edit}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={permission.edit}
                                  onCheckedChange={() => handleRolePermissionToggle(module, 'edit')}
                                  disabled={!modulePerm.edit || !permission.view}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={permission.delete}
                                  onCheckedChange={() => handleRolePermissionToggle(module, 'delete')}
                                  disabled={!modulePerm.edit || !permission.view || !permission.edit}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                
              </CardContent>
              <UIDialogFooter className="flex flex-row items-center justify-between gap-3 border-t bg-background/80 backdrop-blur-sm px-6 py-4">
                <div>
                  {roleForm.id && (
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setRoleForm({ id: '', name: '', permissions: [] })}
                    >
                      <Plus className="h-4 w-4 mr-2" /> New Role
                    </Button>
                  )}
                </div>
                <div className="space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsRoleModalOpen(false);
                      setRoleForm({ id: '', name: '', permissions: [] });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {roleForm.id ? 'Update Permission' : 'Add Permission'}
                  </Button>
                </div>
              </UIDialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      {/* Confirm Dialog (used for delete role/user) */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <UIDialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              type="button"
              onClick={() => {
                const action = confirmDialog.onConfirm;
                setConfirmDialog({
                  open: false,
                  title: '',
                  description: '',
                  confirmLabel: 'Confirm',
                  onConfirm: null,
                });
                if (action) action();
              }}
            >
              {confirmDialog.confirmLabel}
            </Button>
          </UIDialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{userForm.id ? 'Edit User' : 'Add New User'}</CardTitle>
            </CardHeader>
            <form onSubmit={handleUserSubmit} autoComplete="off">
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    autoComplete="off"
                    value={userForm.name}
                    onChange={handleUserFormChange}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="off"
                    value={userForm.email}
                    onChange={handleUserFormChange}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    name="role"
                    value={userForm.role}
                    onValueChange={(value) => setUserForm(prev => ({ ...prev, role: value as UserRole }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!userForm.id && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={userForm.password}
                        onChange={handleUserFormChange}
                        placeholder="Enter password"
                        required={!userForm.id}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!modulePerm.edit) {
                            toast({ title: 'Not allowed', description: 'You only have view permission for User Management.', variant: 'destructive' });
                            return;
                          }
                          setShowPassword((prev) => !prev);
                        }}
                        disabled={!modulePerm.edit}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsUserModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!modulePerm.edit}>
                  {userForm.id ? 'Update User' : 'Add User'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserManagement;