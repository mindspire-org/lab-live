import React from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ConfirmStaffDeleteDialogProps {
  staffName: string;
  onConfirm: () => void;
  onCancel?: () => void;
  /**
   * Controlled open state; if provided, the dialog acts as controlled component.
   */
  isOpen?: boolean;
  /** Whether to show Urdu labels */
  isUrdu?: boolean;
  /** Render element to use as trigger; if omitted, a trash icon button is rendered */
  trigger?: React.ReactNode;
}

const ConfirmStaffDeleteDialog: React.FC<ConfirmStaffDeleteDialogProps> = ({ staffName, onConfirm, onCancel, isOpen, trigger }) => {
  return (
    <Dialog open={isOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Staff Member</DialogTitle>
        </DialogHeader>
        <p className="py-4">Are you sure you want to delete <strong>{staffName}</strong>? This action cannot be undone.</p>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmStaffDeleteDialog;
