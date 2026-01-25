"use client";

import { useState, useEffect } from "react";
import { X, Calendar, User, FileText, CheckCircle, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { swapService, employeeService, type SwapRequest, type Employee } from "@/lib/firestore";

interface SwapFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    swap?: SwapRequest | null;
    onSuccess: () => void;
}

export function SwapFormModal({ isOpen, onClose, swap, onSuccess }: SwapFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [formData, setFormData] = useState({
        employeeId: "",
        employeeName: "",
        workDate: "",
        holidayDate: "",
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

    // Update form when swap prop changes
    useEffect(() => {
        if (swap) {
            setFormData({
                employeeId: swap.employeeId || "",
                employeeName: swap.employeeName || "",
                workDate: swap.workDate ? new Date(swap.workDate).toISOString().split('T')[0] : "",
                holidayDate: swap.holidayDate ? new Date(swap.holidayDate).toISOString().split('T')[0] : "",
                reason: swap.reason || "",
                status: swap.status || "รออนุมัติ",
            });
        } else {
            setFormData({
                employeeId: "",
                employeeName: "",
                workDate: "",
                holidayDate: "",
                reason: "",
                status: "รออนุมัติ",
            });
        }
    }, [swap, isOpen]);

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
            const swapData = {
                employeeId: formData.employeeId,
                employeeName: formData.employeeName,
                workDate: new Date(formData.workDate),
                holidayDate: new Date(formData.holidayDate),
                reason: formData.reason,
                status: formData.status,
            };

            if (swap?.id) {
                await swapService.update(swap.id, swapData);
            } else {
                await swapService.create({
                    ...swapData,
                    createdAt: new Date(),
                });
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving swap request:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <ArrowLeftRight className="w-5 h-5 text-purple-600" />
                            {swap ? "แก้ไขการสลับวันหยุด" : "เพิ่มการสลับวันหยุด"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Employee */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> พนักงาน <span className="text-red-500">*</span></label>
                            <select
                                value={formData.employeeId}
                                onChange={(e) => handleEmployeeChange(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-primary outline-none"
                                required
                                disabled={!!swap}
                            >
                                <option value="">-- เลือกพนักงาน --</option>
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date Swap Group */}
                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-3 relative overflow-hidden">
                            {/* Arrow Decoration */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-100 pointer-events-none">
                                <ArrowLeftRight className="w-24 h-24 opacity-20" />
                            </div>

                            <div className="relative z-10 grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-green-700 font-semibold flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> วันที่มาทำ <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.workDate}
                                        onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-green-200 ring-1 ring-green-100 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 outline-none"
                                        required
                                    />
                                    <p className="text-[10px] text-gray-400">วันที่ต้องมาทำงานแทน</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-red-700 font-semibold flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> วันที่หยุด <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.holidayDate}
                                        onChange={(e) => setFormData({ ...formData, holidayDate: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-red-200 ring-1 ring-red-100 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 outline-none"
                                        required
                                    />
                                    <p className="text-[10px] text-gray-400">วันที่ต้องการหยุด</p>
                                </div>
                            </div>
                        </div>

                        {/* Reason & Status */}
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> เหตุผล <span className="text-red-500">*</span></label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                                    rows={2}
                                    placeholder="ระบุเหตุผลการขอสลับวัน..."
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

                        {/* Footer Actions */}
                        <div className="pt-2 flex gap-2 justify-end border-t border-gray-100 mt-2">
                            <Button type="button" onClick={onClose} variant="ghost" className="h-9 px-4 text-gray-600 hover:text-gray-900" disabled={loading}>
                                ยกเลิก
                            </Button>
                            <Button type="submit" className="h-9 px-6 bg-primary-dark hover:bg-primary-dark/90 text-white shadow-sm rounded-lg" disabled={loading}>
                                {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                            </Button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
