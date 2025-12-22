import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { UIStaff } from "@/lab utils/staffService";

interface StaffFormProps {
  isUrdu: boolean;
  onClose: () => void;
  onSave: (staff: Partial<UIStaff>) => void;
  staff?: UIStaff | null; // edit mode
}

const StaffForm: React.FC<StaffFormProps> = ({ isUrdu, onClose, onSave, staff }) => {
  const [name, setName] = useState(staff?.name || "");
  const [position, setPosition] = useState(staff?.position || "");
  const [phone, setPhone] = useState(staff?.phone || "");
  const [email, setEmail] = useState(staff?.email || "");
  const [address, setAddress] = useState(staff?.address || "");
  const [salary, setSalary] = useState(staff?.salary?.toString() || "");
  const [joinDate, setJoinDate] = useState(staff?.joinDate ? staff.joinDate.substring(0,10) : "");
  const [status, setStatus] = useState<"active" | "inactive">(staff?.status || "active");

  const handleSubmit = () => {
    onSave({
      _id: staff?._id,
      name,
      position,
      phone,
      email,
      address,
      salary: salary ? Number(salary) : undefined,
      joinDate: joinDate ? new Date(joinDate).toISOString() : undefined,
      status,
    });
    onClose();
  };

  const t = (en: string, ur: string) => (isUrdu ? ur : en);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>{staff ? t("Edit Staff", "عملہ میں ترمیم کریں") : t("Add Staff", "عملہ شامل کریں")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left column */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">{t("Staff Name", "نام")}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />

            <label className="block text-sm font-medium">{t("Phone Number", "فون نمبر")}</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />

            <label className="block text-sm font-medium">{t("Address", "پتہ")}</label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />

            <label className="block text-sm font-medium">{t("Salary", "تنخواہ")}</label>
            <Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} />
          </div>

          {/* Right column */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">{t("Position", "عہدہ")}</label>
            <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder={t("Enter position", "عہدہ درج کریں")} />

            <label className="block text-sm font-medium">{t("Join Date", "شمولیت کی تاریخ")}</label>
            <Input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} />

            <label className="block text-sm font-medium">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

            <label className="block text-sm font-medium">{t("Status", "حیثیت")}</label>
            <select
              className="border rounded p-2 w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
            >
              <option value="active">{t("Active", "فعال")}</option>
              <option value="inactive">{t("Inactive", "غیرفعال")}</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("Cancel", "منسوخ")}</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || !position.trim()}>{t("Save", "محفوظ کریں")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StaffForm;
