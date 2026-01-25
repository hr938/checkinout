"use client";

import { useState, useEffect } from "react";
import { X, Clock, Calendar, User, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { otService, employeeService, type OTRequest, type Employee } from "@/lib/firestore";

interface OTFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    ot?: OTRequest | null;
    onSuccess: () => void;
}

export function OTFormModal({ isOpen, onClose, ot, onSuccess }: OTFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [formData, setFormData] = useState({
        employeeId: "",
        employeeName: "",
        date: "",
        startTime: "",
        endTime: "",
        hours: 0,
        reason: "",
        status: "รออนุมัติ" as "รออนุมัติ" | "อนุมัติ" | "ไม่อนุมัติ",
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

    // Update form when ot prop changes
    useEffect(() => {
        if (ot) {
            setFormData({
                employeeId: ot.employeeId || "",
                employeeName: ot.employeeName || "",
                date: ot.date ? new Date(ot.date).toISOString().split('T')[0] : "",
                startTime: ot.startTime ? new Date(ot.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : "",
                endTime: ot.endTime ? new Date(ot.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : "",
                hours: ot.startTime && ot.endTime
                    ? (() => {
                        const start = new Date(ot.startTime);
                        const end = new Date(ot.endTime);
                        const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                        return diff > 0 ? parseFloat(diff.toFixed(2)) : 0;
                    })()
                    : 0,
                reason: ot.reason || "",
                status: ot.status || "รออนุมัติ",
            });
        } else {
            setFormData({
                employeeId: "",
                employeeName: "",
                date: new Date().toISOString().split('T')[0],
                startTime: "",
                endTime: "",
                hours: 0,
                reason: "",
                status: "รออนุมัติ",
            });
        }
    }, [ot, isOpen]);

    // Calculate hours from time range
    useEffect(() => {
        if (formData.startTime && formData.endTime) {
            const [startHour, startMin] = formData.startTime.split(':').map(Number);
            const [endHour, endMin] = formData.endTime.split(':').map(Number);

            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;

            let diffMinutes = endMinutes - startMinutes;
            if (diffMinutes < 0) {
                diffMinutes += 24 * 60; // Handle overnight OT
            }

            const hours = diffMinutes / 60;
            setFormData(prev => ({ ...prev, hours: parseFloat(hours.toFixed(2)) }));
        }
    }, [formData.startTime, formData.endTime]);

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
            const otData = {
                employeeId: formData.employeeId,
                employeeName: formData.employeeName,
                date: new Date(formData.date),
                startTime: formData.startTime ? new Date(`${formData.date}T${formData.startTime}:00`) : new Date(formData.date),
                endTime: formData.endTime ? new Date(`${formData.date}T${formData.endTime}:00`) : new Date(formData.date),
                reason: formData.reason,
                status: formData.status,
            };

            if (ot?.id) {
                await otService.update(ot.id, otData);
            } else {
                await otService.create({
                    ...otData,
                    createdAt: new Date(),
                });
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving OT:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Compact Header */}
                <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-600" />
                            {ot ? "แก้ไขข้อมูล OT" : "เพิ่มรายการ OT"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Employee & Date */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> พนักงาน <span className="text-red-500">*</span></label>
                                <select
                                    value={formData.employeeId}
                                    onChange={(e) => handleEmployeeChange(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-primary outline-none"
                                    required
                                    disabled={!!ot}
                                >
                                    <option value="">-- เลือกพนักงาน --</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> วันที่ทำ OT <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                    required
                                />
                            </div>
                        </div>

                        {/* Status & Hours Group */}
                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> ช่วงเวลาทำงาน</label>
                                {formData.hours > 0 && (
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                        รวม {formData.hours} ชม.
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500">เริ่มเวลา</label>
                                    <input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500">สิ้นสุดเวลา</label>
                                    <input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Reason & Status */}
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> รายละเอียดงาน <span className="text-red-500">*</span></label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                                    rows={2}
                                    placeholder="ระบุรายละเอียดงานที่ทำ..."
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> สถานะ</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                >
                                    <option value="รออนุมัติ">รออนุมัติ</option>
                                    <option value="อนุมัติ">อนุมัติ</option>
                                    <option value="ไม่อนุมัติ">ไม่อนุมัติ</option>
                                </select>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-2 flex gap-2 justify-end border-t border-gray-100 mt-2">
                            <Button type="button" onClick={onClose} variant="ghost" className="h-9 px-4 text-gray-600 hover:text-gray-900" disabled={loading}>
                                ยกเลิก
                            </Button>
                            <Button type="submit" className="h-9 px-6 bg-primary-dark hover:bg-primary-dark/90 text-white shadow-sm rounded-lg" disabled={loading}>
                                {loading ? "กำลังบันทึก..." : "ยืนยันข้อมูล"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
