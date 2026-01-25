"use client";

import { useState, useEffect } from "react";
import { X, Clock, Calendar, MapPin, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { attendanceService, employeeService, type Attendance, type Employee, adminLogService } from "@/lib/firestore";
import { isLate, getLateMinutes } from "@/lib/workTime";
import { useAdmin } from "@/components/auth/AuthProvider";

interface AttendanceFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    attendance?: Attendance | null;
    onSuccess: () => void;
}

export function AttendanceFormModal({ isOpen, onClose, attendance, onSuccess }: AttendanceFormModalProps) {
    const { user } = useAdmin();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [editId, setEditId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        employeeId: "",
        employeeName: "",
        date: "",
        checkInTime: "",
        checkOutTime: "",
        status: "เข้างาน" as "เข้างาน" | "ออกงาน" | "ลางาน" | "สาย" | "ก่อนพัก" | "หลังพัก" | "ออกนอกพื้นที่ขาไป" | "ออกนอกพื้นที่ขากลับ",
        location: "",
    });

    // Load employees
    useEffect(() => {
        const loadEmployees = async () => {
            try {
                const data = await employeeService.getAll();
                setEmployees(data);
            } catch (error) {
                console.error("Error loading employees:", error);
            }
        };
        loadEmployees();
    }, []);

    // Update form when attendance prop changes
    useEffect(() => {
        if (attendance) {
            setEditId(attendance.id || null);
            setFormData({
                employeeId: attendance.employeeId || "",
                employeeName: attendance.employeeName || "",
                date: attendance.date ? new Date(attendance.date).toISOString().split('T')[0] : "",
                checkInTime: attendance.checkIn ? new Date(attendance.checkIn).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : "",
                checkOutTime: attendance.checkOut ? new Date(attendance.checkOut).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : "",
                status: attendance.status || "เข้างาน",
                location: attendance.location || "",
            });
        } else {
            setEditId(null);
            const today = new Date().toISOString().split('T')[0];
            const now = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            setFormData({
                employeeId: "",
                employeeName: "",
                date: today,
                checkInTime: now,
                checkOutTime: "",
                status: "เข้างาน",
                location: "",
            });
        }
    }, [attendance, isOpen]); // Add isOpen

    if (!isOpen) return null;

    const handleEmployeeChange = (employeeId: string) => {
        const employee = employees.find(e => e.id === employeeId);
        setFormData({
            ...formData,
            employeeId,
            employeeName: employee?.name || "",
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const dateStr = formData.date;

            // Helper to parse HH:mm to Date
            const toDateObj = (timeStr: string) => {
                if (!timeStr) return null;
                const [hours, minutes] = timeStr.split(':').map(Number);
                const d = new Date(dateStr); // Use selected date
                d.setHours(hours, minutes, 0, 0);
                return d;
            };

            const checkInDate = toDateObj(formData.checkInTime);
            let finalStatus = formData.status;
            let finalLateMinutes = 0;

            // Recalculate Late Status & Minutes
            if (checkInDate) {
                // Only recalculate for check-in related statuses
                if (finalStatus === "เข้างาน" || finalStatus === "สาย") {
                    const isLateBool = isLate(checkInDate);
                    const lateM = getLateMinutes(checkInDate);

                    if (isLateBool) {
                        // Change requirement: Status remains "เข้างาน" even if late, just show late flag/minutes
                        finalStatus = "เข้างาน";
                        finalLateMinutes = lateM;
                    } else {
                        finalStatus = "เข้างาน";
                        finalLateMinutes = 0;
                    }
                }
            }

            const attendanceData = {
                employeeId: formData.employeeId,
                employeeName: formData.employeeName,
                date: new Date(dateStr), // Base date
                checkIn: checkInDate,
                checkOut: toDateObj(formData.checkOutTime),
                status: finalStatus,
                location: formData.location || "Manual Entry",
                lateMinutes: finalLateMinutes,
            };

            let logAction = "create";
            if (editId) {
                logAction = "update";
                await attendanceService.update(editId, attendanceData);
            } else {
                await attendanceService.create(attendanceData);
            }

            // Log Admin Action
            if (user) {
                await adminLogService.create({
                    adminId: user.uid,
                    adminName: user.email || "Admin",
                    action: logAction as "create" | "update" | "delete",
                    module: "attendance",
                    target: formData.employeeName,
                    details: `${editId ? "แก้ไข" : "เพิ่ม"}การลงเวลาของ ${formData.employeeName} (${dateStr}) CheckIn: ${formData.checkInTime || '-'} ${finalStatus === 'สาย' ? `(สาย ${finalLateMinutes} นาที)` : ''}`
                });
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving attendance:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                {/* Compact Header */}
                <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-600" />
                            {attendance ? "ปรับปรุงเวลาลงงาน" : "บันทึกเวลาทำงาน"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-5 flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Employee & Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> พนักงาน <span className="text-red-500">*</span></label>
                                <select
                                    value={formData.employeeId}
                                    onChange={(e) => handleEmployeeChange(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-primary outline-none"
                                    required
                                    disabled={!!attendance}
                                >
                                    <option value="">-- เลือกพนักงาน --</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> สถานะ</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-primary outline-none"
                                    required
                                >
                                    <option value="เข้างาน">เข้างาน</option>
                                    <option value="ออกงาน">ออกงาน</option>
                                    <option value="สาย">สาย</option>
                                    <option value="ลางาน">ลางาน</option>
                                    <option value="ก่อนพัก">ก่อนพัก</option>
                                    <option value="หลังพัก">หลังพัก</option>
                                    <option value="ออกนอกพื้นที่ขาไป">ออกนอกพื้นที่ขาไป</option>
                                    <option value="ออกนอกพื้นที่ขากลับ">ออกนอกพื้นที่ขากลับ</option>
                                </select>
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> วันที่ทำรายการ</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-600">เวลาเข้า (Check In)</label>
                                    <input
                                        type="time"
                                        value={formData.checkInTime}
                                        onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none font-mono text-center"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-600">เวลาออก (Check Out)</label>
                                    <input
                                        type="time"
                                        value={formData.checkOutTime}
                                        onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none font-mono text-center" // Removed required for flexibility
                                        placeholder="--:--"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> สถานที่ / หมายเหตุ</label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-primary outline-none"
                                placeholder="ระบุสถานที่ทำงาน หรือ หมายเหตุเพิ่มเติม"
                            />
                        </div>

                        {/* Actions */}
                        <div className="pt-2 flex gap-2 justify-end">
                            <Button type="button" onClick={onClose} variant="ghost" className="h-9 px-4 text-gray-600 hover:text-gray-900" disabled={loading}>
                                ยกเลิก
                            </Button>
                            <Button type="submit" className="h-9 px-6 bg-primary-dark hover:bg-primary-dark/90 text-white shadow-sm rounded-lg" disabled={loading}>
                                {loading ? "กำลังบันทึก..." : "ยืนยันการบันทึก"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
