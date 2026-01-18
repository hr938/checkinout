"use client";

import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { employeeService, shiftService, type Employee, type Shift } from "@/lib/firestore";

interface EmployeeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee?: Employee | null;
    onSuccess: () => void;
    readOnly?: boolean;
}

export function EmployeeFormModal({ isOpen, onClose, employee, onSuccess, readOnly = false }: EmployeeFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [shifts, setShifts] = useState<Shift[]>([]);


    const [formData, setFormData] = useState({
        employeeId: "",
        name: "",
        email: "",
        phone: "",
        type: "รายเดือน" as "รายเดือน" | "รายวัน" | "ชั่วคราว",
        employmentType: "ประจำ" as "ประจำ" | "ชั่วคราว",
        position: "",
        department: "",
        baseSalary: 0,
        status: "ทำงาน" as "ทำงาน" | "ลาออก" | "พ้นสภาพ",
        endDate: undefined as Date | undefined,
        lineUserId: "",
        weeklyHolidays: [0] as number[], // Default: วันอาทิตย์หยุด
        shiftId: "" as string, // กะเวลา
        leaveQuota: {
            personal: 3,
            sick: 30,
            vacation: 5,
        },
    });

    // Load shifts when modal opens
    useEffect(() => {
        if (isOpen) {
            shiftService.getAll()
                .then(data => setShifts(data))
                .catch(err => console.error("Error loading shifts:", err));
        }
    }, [isOpen]);

    // Update form when employee prop changes
    useEffect(() => {
        if (employee) {
            setFormData({
                employeeId: employee.employeeId || "",
                name: employee.name || "",
                email: employee.email || "",
                phone: employee.phone || "",
                type: employee.type || "รายเดือน",
                employmentType: employee.employmentType || (employee.type === "ชั่วคราว" ? "ชั่วคราว" : "ประจำ"),
                position: employee.position || "",
                department: employee.department || "",
                baseSalary: employee.baseSalary || 0,
                status: employee.status || "ทำงาน",
                endDate: employee.endDate,
                lineUserId: employee.lineUserId || "",
                weeklyHolidays: employee.weeklyHolidays || [0],
                shiftId: employee.shiftId || "",
                leaveQuota: {
                    personal: employee.leaveQuota?.personal || 3,
                    sick: employee.leaveQuota?.sick || 30,
                    vacation: employee.leaveQuota?.vacation || 5,
                },
            });
        } else {
            // Reset form for new employee
            setFormData({
                employeeId: "",
                name: "",
                email: "",
                phone: "",
                type: "รายเดือน",
                employmentType: "ประจำ",
                position: "",
                department: "",
                baseSalary: 0,
                status: "ทำงาน",
                endDate: undefined,
                lineUserId: "",
                weeklyHolidays: [0],
                shiftId: "",
                leaveQuota: {
                    personal: 6,
                    sick: 30,
                    vacation: 10,
                },
            });
        }
    }, [employee, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (readOnly) return;
        setLoading(true);

        try {
            if (employee?.id) {
                // Update existing employee
                await employeeService.update(employee.id, formData);
            } else {
                // Create new employee
                await employeeService.create({
                    ...formData,
                    registeredDate: new Date(),
                });
            }

            // Reset form
            setFormData({
                employeeId: "",
                name: "",
                email: "",
                phone: "",
                type: "รายเดือน",
                employmentType: "ประจำ",
                position: "",
                department: "",
                baseSalary: 0,
                status: "ทำงาน",
                endDate: undefined,
                lineUserId: "",
                weeklyHolidays: [0],
                shiftId: "",
                leaveQuota: {
                    personal: 6,
                    sick: 30,
                    vacation: 10,
                },
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving employee:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between rounded-t-3xl">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {readOnly ? "ข้อมูลพนักงาน" : (employee ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงานใหม่")}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700">ข้อมูลพื้นฐาน</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    รหัสพนักงาน
                                </label>
                                <input
                                    type="text"
                                    value={formData.employeeId}
                                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EBDACA] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                                    placeholder="เช่น EMP001"
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ชื่อ-นามสกุล <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EBDACA] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                                    placeholder="กรอกชื่อ-นามสกุล"
                                    required
                                    disabled={readOnly}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    อีเมล
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EBDACA] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                                    placeholder="example@email.com"
                                    disabled={readOnly}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EBDACA] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                                    placeholder="0xx-xxx-xxxx"
                                    required
                                    disabled={readOnly}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ตำแหน่ง <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.position}
                                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EBDACA] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                                    placeholder="กรอกตำแหน่ง"
                                    required
                                    disabled={readOnly}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    แผนก/สังกัด
                                </label>
                                <input
                                    type="text"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EBDACA] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                                    placeholder="กรอกแผนกหรือสังกัด"
                                    disabled={readOnly}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    รูปแบบการจ้าง <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.employmentType}
                                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as any })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EBDACA] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                                    required
                                    disabled={readOnly}
                                >
                                    <option value="ประจำ">ประจำ</option>
                                    <option value="ชั่วคราว">ชั่วคราว</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    การจ่ายเงิน <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EBDACA] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                                    required
                                    disabled={readOnly}
                                >
                                    <option value="รายเดือน">รายเดือน</option>
                                    <option value="รายวัน">รายวัน</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {formData.type === "รายวัน" ? "ค่าจ้างรายวัน (บาท)" : "เงินเดือน (บาท)"}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.baseSalary}
                                    onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EBDACA] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                                    placeholder="0.00"
                                    disabled={readOnly}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    สถานะ <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EBDACA] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                                    required
                                    disabled={readOnly}
                                >
                                    <option value="ทำงาน">ทำงาน</option>
                                    <option value="ลาออก">ลาออก</option>
                                    <option value="พ้นสภาพ">พ้นสภาพ</option>
                                </select>
                            </div>

                            {/* Shift Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    กะเวลาทำงาน
                                </label>
                                <select
                                    value={formData.shiftId}
                                    onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EBDACA] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                                    disabled={readOnly}
                                >
                                    <option value="">-- ใช้เวลาทำงานหลัก --</option>
                                    {shifts.map(shift => (
                                        <option key={shift.id} value={shift.id}>
                                            {shift.name} ({String(shift.checkInHour).padStart(2, '0')}:{String(shift.checkInMinute).padStart(2, '0')} - {String(shift.checkOutHour).padStart(2, '0')}:{String(shift.checkOutMinute).padStart(2, '0')})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-400 mt-1">
                                    {formData.shiftId ? "ใช้เวลาตามกะที่เลือก" : "ใช้เวลาทำงานตามการตั้งค่าระบบ"}
                                </p>
                            </div>

                            {((formData.status as string) !== "ทำงาน" || formData.type === "ชั่วคราว") && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {(formData.status as string) !== "ทำงาน" ? "วันที่สิ้นสุดการทำงาน" : "วันสิ้นสุดสัญญา"}
                                        {(formData.status as string) !== "ทำงาน" && <span className="text-red-500">*</span>}
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : ""}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value ? new Date(e.target.value) : undefined })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EBDACA] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                                        required={(formData.status as string) !== "ทำงาน"}
                                        disabled={readOnly}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* LINE User ID - แสดงเฉพาะเมื่อแก้ไขพนักงานที่มีอยู่แล้ว */}
                    {employee && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-700">การเชื่อมต่อ LINE</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    LINE User ID
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.lineUserId}
                                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EBDACA] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 font-mono text-sm"
                                        placeholder="ยังไม่ได้ผูกบัญชี LINE"
                                        readOnly
                                    />
                                    {formData.lineUserId && !readOnly && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, lineUserId: "" })}
                                            className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors flex items-center gap-2"
                                            title="ลบ LINE User ID"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span className="hidden sm:inline">ลบ</span>
                                        </button>
                                    )}
                                </div>
                                {formData.lineUserId ? (
                                    <p className="text-xs text-green-600 mt-1">
                                        ✓ ผูกบัญชีแล้ว - ลบเพื่อให้พนักงานสามารถผูกบัญชีใหม่ได้
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-400 mt-1">
                                        พนักงานจะถูกผูกบัญชีอัตโนมัติเมื่อเข้าใช้งานผ่าน LINE
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Weekly Holidays - วันหยุดประจำสัปดาห์ */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700">วันหยุดประจำสัปดาห์</h3>
                        <p className="text-sm text-gray-500">เลือกวันที่พนักงานคนนี้หยุดประจำในแต่ละสัปดาห์</p>

                        <div className="flex flex-wrap gap-2">
                            {[
                                { day: 0, label: "อา" },
                                { day: 1, label: "จ" },
                                { day: 2, label: "อ" },
                                { day: 3, label: "พ" },
                                { day: 4, label: "พฤ" },
                                { day: 5, label: "ศ" },
                                { day: 6, label: "ส" },
                            ].map(({ day, label }) => {
                                const isSelected = formData.weeklyHolidays.includes(day);
                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => {
                                            if (readOnly) return;
                                            setFormData(prev => ({
                                                ...prev,
                                                weeklyHolidays: isSelected
                                                    ? prev.weeklyHolidays.filter(d => d !== day)
                                                    : [...prev.weeklyHolidays, day].sort()
                                            }));
                                        }}
                                        disabled={readOnly}
                                        className={`w-12 h-12 rounded-xl font-medium transition-all duration-200 ${isSelected
                                            ? "bg-red-500 text-white shadow-lg shadow-red-200"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            } ${readOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>

                        <p className="text-xs text-gray-400">
                            {formData.weeklyHolidays.length === 0
                                ? "ไม่มีวันหยุดประจำสัปดาห์ (ทำงานทุกวัน)"
                                : `หยุดสัปดาห์ละ ${formData.weeklyHolidays.length} วัน`
                            }
                        </p>
                    </div>

                    {/* Leave Quota */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-700">สิทธิ์การลา</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ลากิจ (วัน)
                                </label>
                                <input
                                    type="number"
                                    value={formData.leaveQuota.personal}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        leaveQuota: { ...formData.leaveQuota, personal: parseInt(e.target.value) || 0 }
                                    })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EBDACA] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                                    min="0"
                                    disabled={readOnly}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ลาป่วย (วัน)
                                </label>
                                <input
                                    type="number"
                                    value={formData.leaveQuota.sick}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        leaveQuota: { ...formData.leaveQuota, sick: parseInt(e.target.value) || 0 }
                                    })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EBDACA] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                                    min="0"
                                    disabled={readOnly}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ลาพักร้อน (วัน)
                                </label>
                                <input
                                    type="number"
                                    value={formData.leaveQuota.vacation}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        leaveQuota: { ...formData.leaveQuota, vacation: parseInt(e.target.value) || 0 }
                                    })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EBDACA] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                                    min="0"
                                    disabled={readOnly}
                                />
                            </div>
                        </div>
                    </div>



                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="outline"
                            className="flex-1 h-12 rounded-xl"
                            disabled={loading}
                        >
                            {readOnly ? "ปิด" : "ยกเลิก"}
                        </Button>
                        {!readOnly && (
                            <Button
                                type="submit"
                                className="flex-1 h-12 bg-primary-dark hover:bg-primary-dark/90 text-white rounded-xl"
                                disabled={loading}
                            >
                                {loading ? "กำลังบันทึก..." : employee ? "บันทึกการแก้ไข" : "เพิ่มพนักงาน"}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
