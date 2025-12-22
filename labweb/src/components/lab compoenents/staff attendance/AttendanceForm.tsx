import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UIStaff } from "@/lab utils/staffService";

interface AttendanceFormProps {
  isUrdu: boolean;
  staffList: UIStaff[];
  defaultStaffId?: string;
  defaultDate?: string;
  onClose: () => void;
  onSave: (data: { staffId: string; date: string; status: string }) => void;
}

const AttendanceForm: React.FC<AttendanceFormProps> = ({ isUrdu, staffList, defaultStaffId = "", defaultDate = "", onClose, onSave }) => {
  const [staffId, setStaffId] = useState(defaultStaffId);
  const [date, setDate] = useState(defaultDate);
  const [status, setStatus] = useState("present");

  const handleSubmit = () => {
    onSave({ staffId, date, status });
    onClose();
  };

  const t = (en: string, ur: string) => (isUrdu ? ur : en);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="space-y-4">
        <DialogHeader>
          <DialogTitle>{t("Add Attendance", "حاضری شامل کریں")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="block text-sm font-medium">{t("Staff", "عملہ")}</label>
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="w-full border rounded p-2">
            <option value="" disabled>{t("Select staff", "عملہ منتخب کریں")}</option>
            {staffList.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
          <label className="block text-sm font-medium">{t("Date", "تاریخ")}</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <label className="block text-sm font-medium">{t("Status", "حیثیت")}</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border rounded p-2">
            <option value="present">{t("Present", "حاضر")}</option>
            <option value="absent">{t("Absent", "غیر حاضر")}</option>
            <option value="leave">{t("Leave", "چھٹی")}</option>
          </select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("Cancel", "منسوخ")}</Button>
          <Button onClick={handleSubmit}>{t("Save", "محفوظ کریں")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceForm;
