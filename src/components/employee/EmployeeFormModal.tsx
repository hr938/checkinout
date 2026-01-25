"use client";

import { useState, useEffect } from "react";
import { X, User, Briefcase, Calendar, Clock, DollarSign, Shield, Phone, Mail, Building, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { employeeService, shiftService, type Employee, type Shift, adminLogService } from "@/lib/firestore";
import { useAdmin } from "@/components/auth/AuthProvider";

interface EmployeeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee?: Employee | null;
    onSuccess: () => void;
    readOnly?: boolean;
}

export function EmployeeFormModal({ isOpen, onClose, employee, onSuccess, readOnly = false }: EmployeeFormModalProps) {
    const { user } = useAdmin();
    const [loading, setLoading] = useState(false);
    const [shifts, setShifts] = useState<Shift[]>([]);

    useEffect(() => {
        const loadShifts = async () => {
            try {
                const data = await shiftService.getAll();
                setShifts(data);
            } catch (error) {
                console.error("Error loading shifts:", error);
            }
        };
        loadShifts();
    }, []);

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
        leaveQuota: {
            personal: 3,
            sick: 30,
            vacation: 5,
        },
        weeklyHolidays: [0, 6] as number[],
        shiftId: "" as string,
    });

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
                leaveQuota: {
                    personal: employee.leaveQuota?.personal || 3,
                    sick: employee.leaveQuota?.sick || 30,
                    vacation: employee.leaveQuota?.vacation || 5,
                },
                weeklyHolidays: employee.weeklyHolidays || [0, 6],
                shiftId: employee.shiftId || "",
            });
        } else {
            // Default new employee
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
                leaveQuota: {
                    personal: 6,
                    sick: 30,
                    vacation: 10,
                },
                weeklyHolidays: [0, 6],
                shiftId: "",
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
                await employeeService.update(employee.id, formData);
                await adminLogService.create({
                    adminId: user?.uid || "unknown",
                    adminName: user?.email || "Unknown",
                    action: "update",
                    module: "employee",
                    target: formData.name,
                    details: `แก้ไขข้อมูลพนักงาน: ${formData.name} (Code: ${formData.employeeId})`
                });
            } else {
                await employeeService.create({
                    ...formData,
                    registeredDate: new Date(),
                });
                await adminLogService.create({
                    adminId: user?.uid || "unknown",
                    adminName: user?.email || "Unknown",
                    action: "create",
                    module: "employee",
                    target: formData.name,
                    details: `เพิ่มพนักงานใหม่: ${formData.name} (Code: ${formData.employeeId})`
                });
            }

            // Reset
            setFormData({
                employeeId: "", name: "", email: "", phone: "",
                type: "รายเดือน", employmentType: "ประจำ", position: "", department: "",
                baseSalary: 0, status: "ทำงาน", endDate: undefined,
                leaveQuota: { personal: 6, sick: 30, vacation: 10 },
                weeklyHolidays: [0, 6], shiftId: "",
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert("บันทึกไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Compact Header */}
                <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between shrink-0 z-10">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            {readOnly ? <FileText className="w-5 h-5 text-gray-500" /> : (employee ? <User className="w-5 h-5 text-blue-600" /> : <User className="w-5 h-5 text-green-600" />)}
                            {readOnly ? "ข้อมูลพนักงาน" : (employee ? "แก้ไขข้อมูล" : "เพิ่มพนักงาน")}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Compact Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Group 1: ข้อมูลหลัก (Grid 3 Col ในจอใหญ่) */}
                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" /> ข้อมูลส่วนตัว & การจ้างงาน
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {/* Row 1 */}
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">รหัส</label>
                                    <input type="text" value={formData.employeeId} onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                        placeholder="EMP-XXX" disabled={readOnly} />
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                        placeholder="ชื่อจริง นามสกุล" required disabled={readOnly} />
                                </div>

                                {/* Row 2 */}
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">เบอร์โทร <span className="text-red-500">*</span></label>
                                    <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                        placeholder="08X-XXX-XXXX" required disabled={readOnly} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">ตำแหน่ง <span className="text-red-500">*</span></label>
                                    <input type="text" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                        placeholder="ระบุตำแหน่ง" required disabled={readOnly} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">แผนก</label>
                                    <input type="text" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none"
                                        placeholder="ระบุแผนก" disabled={readOnly} />
                                </div>

                                {/* Row 3 */}
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">ประเภท</label>
                                    <select value={formData.employmentType} onChange={e => setFormData({ ...formData, employmentType: e.target.value as any })}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" disabled={readOnly}>
                                        <option value="ประจำ">ประจำ</option>
                                        <option value="ชั่วคราว">ชั่วคราว/ฝึกงาน</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">สถานะ</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" disabled={readOnly}>
                                        <option value="ทำงาน">🟢 ทำงาน</option>
                                        <option value="ลาออก">🔴 ลาออก</option>
                                        <option value="พ้นสภาพ">⚫ พ้นสภาพ</option>
                                    </select>
                                </div>
                                {((formData.status as string) !== "ทำงาน" || formData.employmentType === "ชั่วคราว") && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-600 mb-1 block text-red-600">
                                            {(formData.status as string) !== "ทำงาน" ? "วันพ้นสภาพ" : "วันหมดสัญญา"} *
                                        </label>
                                        <input type="date" value={formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : ""}
                                            onChange={e => setFormData({ ...formData, endDate: e.target.value ? new Date(e.target.value) : undefined })}
                                            className="w-full px-3 py-2 bg-white border border-red-200 rounded-lg text-sm focus:ring-1 focus:ring-red-500 outline-none"
                                            required disabled={readOnly} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Group 2: รายได้และเวลา (Grid 2 Col) */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5" /> รายได้
                                    </h3>
                                    <div className="flex gap-2 mb-2">
                                        {['รายเดือน', 'รายวัน'].map(t => (
                                            <label key={t} className={`flex-1 flex items-center justify-center p-2 rounded-lg border cursor-pointer border-gray-200 hover:border-blue-300 text-xs font-medium
                                                ${formData.type === t ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-white text-gray-600"}`}>
                                                <input type="radio" name="ptype" className="hidden"
                                                    checked={formData.type === t} onChange={() => !readOnly && setFormData({ ...formData, type: t as any })} disabled={readOnly} />
                                                {t}
                                            </label>
                                        ))}
                                    </div>
                                    <input type="number" value={formData.baseSalary} onChange={e => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none font-mono text-right"
                                        placeholder="0.00" disabled={readOnly} />
                                    <p className="text-[10px] text-gray-400 text-right mt-1">บาท / {formData.type === 'รายวัน' ? 'วัน' : 'เดือน'}</p>
                                </div>

                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" /> เวลางาน
                                    </h3>
                                    <div className="space-y-3">
                                        <select value={formData.shiftId} onChange={e => setFormData({ ...formData, shiftId: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none" disabled={readOnly}>
                                            <option value="">🕒 กะเวลามาตรฐาน (Default)</option>
                                            {shifts.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.checkInHour}:{String(s.checkInMinute).padStart(2, '0')} - {s.checkOutHour}:{String(s.checkOutMinute).padStart(2, '0')})</option>
                                            ))}
                                        </select>

                                        {/* Holidays Fix */}
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 mb-1.5 block">วันหยุดประจำสัปดาห์</label>
                                            <div className="flex gap-1.5">
                                                {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day, idx) => {
                                                    const isHoliday = formData.weeklyHolidays.includes(idx);
                                                    return (
                                                        <div key={idx}
                                                            onClick={() => {
                                                                if (readOnly) return;
                                                                const newHolidays = isHoliday
                                                                    ? formData.weeklyHolidays.filter(h => h !== idx)
                                                                    : [...formData.weeklyHolidays, idx].sort();
                                                                setFormData({ ...formData, weeklyHolidays: newHolidays });
                                                            }}
                                                            style={{
                                                                backgroundColor: isHoliday ? '#ef4444' : 'white',
                                                                color: isHoliday ? 'white' : '#9ca3af',
                                                                borderColor: isHoliday ? '#dc2626' : '#e5e7eb'
                                                            }}
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer transition-all border shadow-sm
                                                                 ${readOnly ? 'pointer-events-none opacity-60' : 'hover:opacity-90'}`}
                                                        >
                                                            {day}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Group 3: สิทธิ์ลา (แถวเดียว Grid 3) */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0 w-20">สิทธิ์วันลา</h3>
                                <div className="grid grid-cols-3 gap-3 flex-1">
                                    {/* Personal */}
                                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-gray-200">
                                        <span className="text-[10px] text-gray-500 px-1">กิจ</span>
                                        <input type="number" className="w-full text-sm font-bold text-center outline-none"
                                            value={formData.leaveQuota.personal} onChange={e => setFormData({ ...formData, leaveQuota: { ...formData.leaveQuota, personal: +e.target.value } })} disabled={readOnly} />
                                    </div>
                                    {/* Sick */}
                                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-gray-200">
                                        <span className="text-[10px] text-gray-500 px-1">ป่วย</span>
                                        <input type="number" className="w-full text-sm font-bold text-center outline-none"
                                            value={formData.leaveQuota.sick} onChange={e => setFormData({ ...formData, leaveQuota: { ...formData.leaveQuota, sick: +e.target.value } })} disabled={readOnly} />
                                    </div>
                                    {/* Vacation */}
                                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-gray-200">
                                        <span className="text-[10px] text-gray-500 px-1">พักร้อน</span>
                                        <input type="number" className="w-full text-sm font-bold text-center outline-none"
                                            value={formData.leaveQuota.vacation} onChange={e => setFormData({ ...formData, leaveQuota: { ...formData.leaveQuota, vacation: +e.target.value } })} disabled={readOnly} />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Compact Footer */}
                <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/50 shrink-0 flex gap-2 justify-end z-10">
                    <Button onClick={onClose} variant="ghost" className="h-9 px-4 text-gray-600 hover:text-gray-900" disabled={loading}>
                        {readOnly ? "ปิด" : "ยกเลิก"}
                    </Button>
                    {!readOnly && (
                        <Button onClick={handleSubmit} className="h-9 px-6 bg-primary-dark hover:bg-primary-dark/90 text-white shadow-sm" disabled={loading}>
                            {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
