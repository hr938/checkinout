"use client";

import { useState, useEffect, useRef } from "react";
import { X, Camera, Calendar, User, FileText, CheckCircle, Clock } from "lucide-react";
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
        attachment: null as string | null, // Keep for legacy reference
        attachments: [] as string[],

        // Hourly Support
        isHourly: false,
        hourlyDate: "",
        hourlyStartTime: "",
        hourlyEndTime: "",
        calculatedHours: 0,
        overrideHours: "",
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

    // Hourly Calculation
    useEffect(() => {
        if (formData.isHourly && formData.hourlyDate && formData.hourlyStartTime && formData.hourlyEndTime) {
            const start = new Date(`${formData.hourlyDate}T${formData.hourlyStartTime}`);
            const end = new Date(`${formData.hourlyDate}T${formData.hourlyEndTime}`);

            if (end > start) {
                const diffMs = end.getTime() - start.getTime();
                const rawHours = diffMs / (1000 * 60 * 60);
                setFormData(prev => ({ ...prev, calculatedHours: parseFloat(rawHours.toFixed(2)) }));
            } else {
                setFormData(prev => ({ ...prev, calculatedHours: 0 }));
            }
        }
    }, [formData.isHourly, formData.hourlyDate, formData.hourlyStartTime, formData.hourlyEndTime]);

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
                attachments: leave.attachments?.length ? leave.attachments : (leave.attachment ? [leave.attachment] : []),


                isHourly: leave.isHourly || false,
                hourlyDate: leave.startDate && leave.isHourly ? new Date(leave.startDate).toISOString().split('T')[0] : "", // Extract date
                hourlyStartTime: leave.hourlyStart || "", // Ensure field name matches DB
                hourlyEndTime: leave.hourlyEnd || "",
                calculatedHours: leave.hours || 0,
                overrideHours: leave.hours ? leave.hours.toString() : "",
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
                attachments: [],
                isHourly: false,
                hourlyDate: "",
                hourlyStartTime: "",
                hourlyEndTime: "",
                calculatedHours: 0,
                overrideHours: "",
            });
        }
    }, [leave, isOpen]);

    if (!isOpen) return null;

    const calculateDays = () => {
        if (formData.startDate && formData.endDate) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return diffDays > 0 ? diffDays : 0;
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
        if (!e.target.files?.length) return;
        const newFiles = Array.from(e.target.files);

        // Limit total count if needed, e.g. max 5
        // if (formData.attachments.length + newFiles.length > 5) {
        //     alert("อัพโหลดได้สูงสุด 5 รูป");
        //     return;
        // }

        const validFiles = newFiles.filter(file => {
            if (!file.type.startsWith('image/')) {
                alert(`ไฟล์ ${file.name} ไม่ใช่รูปภาพ`);
                return false;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert(`ไฟล์ ${file.name} ใหญ่เกิน 5MB`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        try {
            const processedImages = await Promise.all(validFiles.map(async (file) => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                        try {
                            const base64 = ev.target?.result as string;
                            const compressed = await compressBase64Image(base64);
                            resolve(compressed);
                        } catch (e) {
                            reject(e);
                        }
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }));

            setFormData(prev => ({
                ...prev,
                attachments: [...prev.attachments, ...processedImages]
            }));

        } catch (error) {
            console.error('Error processing images:', error);
            alert('เกิดข้อผิดพลาดในการประมวลผลรูปภาพบางไฟล์');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let finalStartDate: Date;
            let finalEndDate: Date;
            let hours = 0;

            if (formData.isHourly) {
                if (!formData.hourlyDate || !formData.hourlyStartTime || !formData.hourlyEndTime) {
                    alert("กรุณาระบุวันและเวลาให้ครบถ้วน");
                    setLoading(false);
                    return;
                }
                finalStartDate = new Date(`${formData.hourlyDate}T${formData.hourlyStartTime}`);
                finalEndDate = new Date(`${formData.hourlyDate}T${formData.hourlyEndTime}`); // Same date

                if (finalEndDate <= finalStartDate) {
                    alert("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");
                    setLoading(false);
                    return;
                }

                hours = formData.overrideHours ? parseFloat(formData.overrideHours) : formData.calculatedHours;
                if (hours <= 0) {
                    alert("จำนวนชั่วโมงไม่ถูกต้อง");
                    setLoading(false);
                    return;
                }

            } else {
                if (!formData.startDate || !formData.endDate) {
                    alert("กรุณาระบุวันเริ่มต้นและสิ้นสุด");
                    setLoading(false);
                    return;
                }
                finalStartDate = new Date(formData.startDate);
                finalEndDate = new Date(formData.endDate);
            }

            const leaveData: any = {
                employeeId: formData.employeeId,
                employeeName: formData.employeeName,
                leaveType: formData.leaveType,
                startDate: finalStartDate,
                endDate: finalEndDate,
                reason: formData.reason,
                status: formData.status,
                attachment: formData.attachments[0] || null, // Create/Update legacy field
                attachments: formData.attachments, // New multiple field
            };

            if (formData.isHourly) {
                leaveData.isHourly = true;
                leaveData.hours = hours;
                leaveData.hourlyStart = formData.hourlyStartTime;
                leaveData.hourlyEnd = formData.hourlyEndTime;
            } else {
                leaveData.isHourly = false;
                leaveData.hours = null;
                leaveData.hourlyStart = null;
                leaveData.hourlyEnd = null;
            }

            if (leave?.id) {
                await leaveService.update(leave.id, leaveData);
            } else {
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Compact Header */}
                <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            {leave ? "แก้ไขการลางาน" : "สร้างคำขอลางาน"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Compact Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Employee & Type Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> พนักงาน <span className="text-red-500">*</span></label>
                                <select
                                    value={formData.employeeId}
                                    onChange={(e) => handleEmployeeChange(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-primary outline-none"
                                    required
                                    disabled={!!leave}
                                >
                                    <option value="">-- เลือกพนักงาน --</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> ประเภท <span className="text-red-500">*</span></label>
                                <select
                                    value={formData.leaveType}
                                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value as any })}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-1 focus:ring-primary outline-none"
                                    required
                                >
                                    <option value="ลาพักร้อน">ลาพักร้อน</option>
                                    <option value="ลาป่วย">ลาป่วย</option>
                                    <option value="ลากิจ">ลากิจ</option>
                                </select>
                            </div>
                        </div>

                        {/* Mode Selection */}
                        <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, isHourly: false }))}
                                className={`flex-1 py-1.5 rounded text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${!formData.isHourly ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Calendar className="w-3.5 h-3.5" /> รายวัน
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, isHourly: true }))}
                                className={`flex-1 py-1.5 rounded text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${formData.isHourly ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Clock className="w-3.5 h-3.5" /> รายชั่วโมง
                            </button>
                        </div>

                        {/* Date Range Group */}
                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                    {formData.isHourly ? <Clock className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                                    ระยะเวลาการลา
                                </label>
                            </div>

                            {formData.isHourly ? (
                                // HOURLY MODE
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-gray-500">วันที่ลา</label>
                                        <input
                                            type="date"
                                            value={formData.hourlyDate || ""}
                                            onChange={(e) => setFormData({ ...formData, hourlyDate: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-gray-500">เวลาเริ่ม</label>
                                            <input
                                                type="time"
                                                value={formData.hourlyStartTime || ""}
                                                onChange={(e) => setFormData({ ...formData, hourlyStartTime: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-gray-500">ถึงเวลา</label>
                                            <input
                                                type="time"
                                                value={formData.hourlyEndTime || ""}
                                                onChange={(e) => setFormData({ ...formData, hourlyEndTime: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Hourly Summary & Override */}
                                    {formData.hourlyDate && formData.hourlyStartTime && formData.hourlyEndTime && (
                                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-semibold text-blue-900">รวมสุทธิ:</span>
                                                <span className="text-xs font-bold text-blue-700">
                                                    {(() => {
                                                        const h = formData.overrideHours ? parseFloat(formData.overrideHours) : (formData.calculatedHours || 0);
                                                        const days = Math.floor(h / 8);
                                                        const rem = parseFloat((h % 8).toFixed(2));
                                                        return `${days > 0 ? days + " วัน " : ""}${rem > 0 || days === 0 ? rem + " ชม." : ""} (${h} ชม.)`;
                                                    })()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 pt-1 border-t border-blue-200/50">
                                                <label className="text-[10px] text-blue-800 font-medium flex-1">ระบุชั่วโมงรวม (แก้ไขได้):</label>
                                                <div className="relative w-20">
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        className="w-full h-7 text-right px-1 text-xs bg-white border border-blue-200 rounded text-blue-900"
                                                        placeholder={formData.calculatedHours?.toString()}
                                                        value={formData.overrideHours || ""}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, overrideHours: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // DAILY MODE
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-gray-500">เริ่มต้น</label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-gray-500">ถึงวันที่</label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                            required
                                            min={formData.startDate}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Daily Summary */}
                            {!formData.isHourly && formData.startDate && formData.endDate && (
                                <div className="flex items-center justify-between text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                                    <span>รวมจำนวนวันลา</span>
                                    <span className="font-bold">{calculateDays()} วัน</span>
                                </div>
                            )}
                        </div>

                        {/* Reason & Status */}
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600">เหตุผลการลา <span className="text-red-500">*</span></label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                                    rows={2}
                                    placeholder="ระบุสาเหตุ..."
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-600">สถานะ</label>
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

                                {/* Attachment Helper */}
                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-xs font-medium text-gray-600">หลักฐาน (ถ้ามี)</label>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />

                                    {formData.attachments.length > 0 ? (
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-4 gap-2">
                                                {formData.attachments.map((att, idx) => (
                                                    <div key={idx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group">
                                                        <img src={att} className="w-full h-full object-cover" alt={`attachment-${idx}`} />
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }))}
                                                            className="absolute top-0 right-0 bg-red-500/80 text-white p-0.5 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                                <Camera className="w-3 h-3" /> เพิ่มรูปภาพ
                                            </button>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={() => fileInputRef.current?.click()}
                                            className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-[10px] text-gray-500 hover:bg-gray-50 hover:border-gray-400 flex items-center justify-center gap-1 transition-colors">
                                            <Camera className="w-3 h-3" /> แนบรูป (เลือกได้หลายไฟล์)
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
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
