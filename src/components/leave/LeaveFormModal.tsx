"use client";

import { useState, useEffect, useRef } from "react";
import { X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { leaveService, employeeService, type LeaveRequest, type Employee } from "@/lib/firestore";
import { compressBase64Image } from "@/lib/storage";

interface LeaveFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    leave?: LeaveRequest | null;
    onSuccess: () => void;
}

export function LeaveFormModal({ isOpen, onClose, leave, onSuccess }: LeaveFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        employeeId: "",
        employeeName: "",
        leaveType: "ลาพักร้อน" as "ลาพักร้อน" | "ลาป่วย" | "ลากิจ",
        startDate: "",
        endDate: "",
        reason: "",
        status: "รออนุมัติ" as "รออนุมัติ" | "อนุมัติ" | "ไม่อนุมัติ",
        attachment: null as string | null,
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

    // Update form when leave prop changes
    useEffect(() => {
        if (leave) {
            setFormData({
                employeeId: leave.employeeId || "",
                employeeName: leave.employeeName || "",
                leaveType: leave.leaveType || "ลาพักร้อน",
                startDate: leave.startDate ? new Date(leave.startDate).toISOString().split('T')[0] : "",
                endDate: leave.endDate ? new Date(leave.endDate).toISOString().split('T')[0] : "",
                reason: leave.reason || "",
                status: leave.status || "รออนุมัติ",
                attachment: leave.attachment || null,
            });
        } else {
            setFormData({
                employeeId: "",
                employeeName: "",
                leaveType: "ลาพักร้อน",
                startDate: "",
                endDate: "",
                reason: "",
                status: "รออนุมัติ",
                attachment: null,
            });
        }
    }, [leave]);

    if (!isOpen) return null;

    const calculateDays = () => {
        if (formData.startDate && formData.endDate) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return diffDays;
        }
        return 0;
    };

    const handleEmployeeChange = (employeeId: string) => {
        const employee = employees.find(e => e.id === employeeId);
        setFormData({
            ...formData,
            employeeId,
            employeeName: employee?.name || "",
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validations
        if (!file.type.startsWith('image/')) {
            alert('กรุณาอัพโหลดไฟล์รูปภาพเท่านั้น');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB
            alert('ขนาดไฟล์ต้องไม่เกิน 5MB');
            return;
        }

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target?.result as string;
                // Compress image
                const compressed = await compressBase64Image(base64);
                setFormData({ ...formData, attachment: compressed });
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error processing image:', error);
            alert('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const leaveData = {
                employeeId: formData.employeeId,
                employeeName: formData.employeeName,
                leaveType: formData.leaveType,
                startDate: new Date(formData.startDate),
                endDate: new Date(formData.endDate),
                reason: formData.reason,
                status: formData.status,
                attachment: formData.attachment || undefined,
            };

            if (leave?.id) {
                // Update existing leave
                await leaveService.update(leave.id, leaveData);
            } else {
                // Create new leave
                await leaveService.create({
                    ...leaveData,
                    createdAt: new Date(),
                });
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving leave:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between rounded-t-2xl z-10">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {leave ? "แก้ไขการลางาน" : "เพิ่มการลางาน"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Employee Selection */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            พนักงาน <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.employeeId}
                            onChange={(e) => handleEmployeeChange(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                            required
                            disabled={!!leave}
                        >
                            <option value="">-- เลือกพนักงาน --</option>
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Leave Type */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                ประเภท <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.leaveType}
                                onChange={(e) => setFormData({ ...formData, leaveType: e.target.value as any })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                required
                            >
                                <option value="ลาพักร้อน">ลาพักร้อน</option>
                                <option value="ลาป่วย">ลาป่วย</option>
                                <option value="ลากิจ">ลากิจ</option>
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                สถานะ
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="รออนุมัติ">รออนุมัติ</option>
                                <option value="อนุมัติ">อนุมัติ</option>
                                <option value="ไม่อนุมัติ">ไม่อนุมัติ</option>
                            </select>
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                เริ่มต้น <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                สิ้นสุด <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                required
                                min={formData.startDate}
                            />
                        </div>
                    </div>

                    {/* Days Display - Compact */}
                    {formData.startDate && formData.endDate && (
                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2 flex items-center justify-between">
                            <span className="text-xs text-blue-600 font-medium">จำนวนวันลาทั้งหมด</span>
                            <span className="text-sm font-bold text-blue-700">{calculateDays()} วัน</span>
                        </div>
                    )}

                    {/* Reason */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            เหตุผล <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            rows={3}
                            placeholder="ระบุเหตุผล..."
                            required
                        />
                    </div>

                    {/* Attachment - Compact */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                            หลักฐาน
                        </label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />

                        {formData.attachment ? (
                            <div className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg bg-gray-50">
                                <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 border border-gray-200">
                                    <img
                                        src={formData.attachment}
                                        alt="Evidence"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-700 truncate">แนบรูปภาพแล้ว</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                        >
                                            <Camera className="w-3 h-3" /> เปลี่ยน
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, attachment: null })}
                                            className="text-[10px] text-red-600 hover:text-red-700 font-medium"
                                        >
                                            ลบ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-2 px-3 border border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-colors bg-white"
                            >
                                <Camera className="w-4 h-4" />
                                <span className="text-xs">คลิกเพื่อแนบรูปภาพ</span>
                            </button>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="outline"
                            className="flex-1 h-10 text-sm"
                            disabled={loading}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white text-sm"
                            disabled={loading}
                        >
                            {loading ? "กำลังบันทึก..." : "บันทึก"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
