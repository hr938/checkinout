"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { leaveService } from "@/lib/firestore";
import { EmployeeHeader } from "@/components/mobile/EmployeeHeader";
import { useEmployee } from "@/contexts/EmployeeContext";
import { FileText, Send, CheckCircle, AlertCircle, Camera, X, Clock, Calendar } from "lucide-react";
import { compressBase64Image } from "@/lib/storage";
import { cn } from "@/lib/utils";

export default function LeaveRequestPage() {
    const { employee } = useEmployee();
    type LeaveType = "ลาพักร้อน" | "ลาป่วย" | "ลากิจ";
    const [leaveType, setLeaveType] = useState<LeaveType | "">("");

    // Hourly Mode Toggle
    const [isHourly, setIsHourly] = useState(false);

    // Hourly Calculation & Override
    const [calculatedHours, setCalculatedHours] = useState(0);
    const [overrideHours, setOverrideHours] = useState("");

    // --- State Separation ---
    // Daily Mode:
    const [dailyStartDate, setDailyStartDate] = useState("");
    const [dailyEndDate, setDailyEndDate] = useState("");

    // Hourly Mode (Single Date):
    const [hourlyDate, setHourlyDate] = useState("");
    const [hourlyStartTime, setHourlyStartTime] = useState("");
    const [hourlyEndTime, setHourlyEndTime] = useState("");

    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Attachment
    // Attachments
    const [attachments, setAttachments] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [quotas, setQuotas] = useState({
        personal: { total: 0, used: 0, remaining: 0 },
        sick: { total: 0, used: 0, remaining: 0 },
        vacation: { total: 0, used: 0, remaining: 0 },
    });

    // Fetch Quota
    useEffect(() => {
        if (employee) {
            const fetchLeaveData = async () => {
                try {
                    const currentYear = new Date().getFullYear();
                    const requests = await leaveService.getByEmployeeId(employee.id || "", currentYear);

                    // Calculate used days
                    const used = { personal: 0, sick: 0, vacation: 0 };

                    requests.forEach(req => {
                        if (req.status === "อนุมัติ" || req.status === "รออนุมัติ") {
                            let days = 0;
                            if (req.isHourly && req.hours) {
                                days = req.hours / 8; // 8 hours = 1 day
                            } else {
                                const start = new Date(req.startDate);
                                const end = new Date(req.endDate);
                                const diffTime = Math.abs(end.getTime() - start.getTime());
                                days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                            }

                            if (req.leaveType === "ลากิจ") used.personal += days;
                            else if (req.leaveType === "ลาป่วย") used.sick += days;
                            else if (req.leaveType === "ลาพักร้อน") used.vacation += days;
                        }
                    });

                    setQuotas({
                        personal: {
                            total: employee.leaveQuota?.personal || 0,
                            used: used.personal,
                            remaining: Math.max(0, (employee.leaveQuota?.personal || 0) - used.personal)
                        },
                        sick: {
                            total: employee.leaveQuota?.sick || 0,
                            used: used.sick,
                            remaining: Math.max(0, (employee.leaveQuota?.sick || 0) - used.sick)
                        },
                        vacation: {
                            total: employee.leaveQuota?.vacation || 0,
                            used: used.vacation,
                            remaining: Math.max(0, (employee.leaveQuota?.vacation || 0) - used.vacation)
                        }
                    });
                } catch (error) {
                    console.error("Error fetching leave data:", error);
                }
            };
            fetchLeaveData();
        }
    }, [employee]);

    // Calculate Hours (Only for Hourly Mode)
    useEffect(() => {
        if (isHourly && hourlyDate && hourlyStartTime && hourlyEndTime) {
            const start = new Date(`${hourlyDate}T${hourlyStartTime}`);
            const end = new Date(`${hourlyDate}T${hourlyEndTime}`);

            if (end > start) {
                const diffMs = end.getTime() - start.getTime();
                const rawHours = diffMs / (1000 * 60 * 60);
                setCalculatedHours(parseFloat(rawHours.toFixed(2)));
            } else {
                setCalculatedHours(0);
            }
        }
    }, [hourlyDate, hourlyStartTime, hourlyEndTime, isHourly]);

    const getFinalHours = () => {
        return overrideHours ? parseFloat(overrideHours) : calculatedHours;
    };

    const getDurationDisplay = () => {
        const h = getFinalHours();
        const days = Math.floor(h / 8);
        const remHours = parseFloat((h % 8).toFixed(2));

        const parts = [];
        if (days > 0) parts.push(`${days} วัน`);
        if (remHours > 0 || days === 0) parts.push(`${remHours} ชั่วโมง`);

        return `${parts.join(" ")} (รวม ${h} ชม.)`;
    };

    const sendFlexMessage = async (leaveData: { type: string, start: Date, end: Date, reason: string, isHourly?: boolean, hours?: number, startStr?: string, endStr?: string }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const liff = (window as any).liff;
        if (liff && liff.isInClient()) {
            try {
                let dateText = "";
                if (leaveData.isHourly) {
                    const startD = leaveData.start.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                    // const endD = leaveData.end.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                    // For single day mode, startD === endD always
                    dateText = `${startD} (${leaveData.startStr} - ${leaveData.endStr}, ${leaveData.hours} ชม.)`;
                } else {
                    dateText = `${leaveData.start.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${leaveData.end.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                }

                await liff.sendMessages([{
                    type: "flex",
                    altText: "ส่งใบลาสำเร็จ",
                    contents: {
                        type: "bubble",
                        header: {
                            type: "box", layout: "vertical",
                            contents: [
                                { type: "text", text: "ส่งคำขอสำเร็จ", weight: "bold", color: "#1DB446", size: "sm" },
                                { type: "text", text: "ใบลา (Leave)", weight: "bold", size: "xl", margin: "md" }
                            ]
                        },
                        body: {
                            type: "box", layout: "vertical",
                            contents: [
                                {
                                    type: "box", layout: "vertical", margin: "lg", spacing: "sm",
                                    contents: [
                                        {
                                            type: "box", layout: "baseline", spacing: "sm",
                                            contents: [
                                                { type: "text", text: "ประเภท", color: "#aaaaaa", size: "sm", flex: 1 },
                                                { type: "text", text: leaveData.type, wrap: true, color: "#666666", size: "sm", flex: 4 }
                                            ]
                                        },
                                        {
                                            type: "box", layout: "baseline", spacing: "sm",
                                            contents: [
                                                { type: "text", text: "เวลา", color: "#aaaaaa", size: "sm", flex: 1 },
                                                { type: "text", text: dateText, wrap: true, color: "#666666", size: "sm", flex: 4 }
                                            ]
                                        },
                                        {
                                            type: "box", layout: "baseline", spacing: "sm",
                                            contents: [
                                                { type: "text", text: "เหตุผล", color: "#aaaaaa", size: "sm", flex: 1 },
                                                { type: "text", text: leaveData.reason, wrap: true, color: "#666666", size: "sm", flex: 4 }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }]);
            } catch (error) {
                console.error("Error sending flex message:", error);
            }
        }
    };

    const notifyAdmin = async (leaveData: { type: string, start: Date, end: Date, reason: string, isHourly?: boolean, hours?: number, startStr?: string, endStr?: string }) => {
        try {
            let detailText = "";
            if (leaveData.isHourly) {
                const startD = leaveData.start.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                // const endD = leaveData.end.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                detailText = `${leaveData.type} (รายชั่วโมง): ${startD} เวลา ${leaveData.startStr} - ${leaveData.endStr} (${leaveData.hours} ชม.)`;
            } else {
                detailText = `${leaveData.type}: ${leaveData.start.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${leaveData.end.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}`;
            }

            await fetch("/api/line/notify-admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "leave",
                    employeeName: employee?.name || "Unknown",
                    details: detailText,
                    reason: leaveData.reason,
                    date: new Date().toISOString()
                }),
            });
        } catch (error) {
            console.error("Error notifying admin:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employee) return;

        let requestDays = 0;
        let finalStartDate: Date;
        let finalEndDate: Date;
        let hours = 0;

        // --- Logic Selection ---
        if (isHourly) {
            // Validate Hourly Inputs
            if (!hourlyDate || !hourlyStartTime || !hourlyEndTime) {
                alert("กรุณาระบุข้อมูลวันที่และเวลาให้ครบถ้วน");
                return;
            }
            finalStartDate = new Date(`${hourlyDate}T${hourlyStartTime}`);
            finalEndDate = new Date(`${hourlyDate}T${hourlyEndTime}`);

            if (finalEndDate <= finalStartDate) {
                alert("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น (สำหรับการลาภายในวันเดียว)");
                return;
            }

            hours = getFinalHours();
            if (hours <= 0) {
                alert("จำนวนชั่วโมงต้องมากกว่า 0");
                return;
            }
            requestDays = hours / 8;

        } else {
            // Validate Daily Inputs
            if (!dailyStartDate || !dailyEndDate) {
                alert("กรุณาระบุวันที่เริ่มและสิ้นสุด");
                return;
            }
            finalStartDate = new Date(dailyStartDate);
            finalEndDate = new Date(dailyEndDate);

            if (finalEndDate < finalStartDate) {
                alert("วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น");
                return;
            }
            const diffTime = Math.abs(finalEndDate.getTime() - finalStartDate.getTime());
            requestDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }

        // Quota Check
        let currentQuota = 0;
        if (leaveType === "ลากิจ") currentQuota = quotas.personal.remaining;
        else if (leaveType === "ลาป่วย") currentQuota = quotas.sick.remaining;
        else if (leaveType === "ลาพักร้อน") currentQuota = quotas.vacation.remaining;

        if (requestDays > currentQuota) {
            alert(`วันลาคงเหลือไม่เพียงพอ (ต้องการ ${requestDays.toFixed(2)} วัน, คงเหลือ ${currentQuota.toFixed(2)} วัน)`);
            return;
        }

        setLoading(true);
        try {
            // Compress attachments
            const compressedAttachments: string[] = [];
            if (attachments.length > 0) {
                const promises = attachments.map(async (att) => {
                    try {
                        return await compressBase64Image(att, 1280, 1280, 0.7);
                    } catch (e) {
                        console.error("Error compressing:", e);
                        return att;
                    }
                });
                const results = await Promise.all(promises);
                compressedAttachments.push(...results);
            }

            const payload: any = {
                employeeId: employee.id || "unknown",
                employeeName: employee.name,
                leaveType,
                startDate: finalStartDate,
                endDate: finalEndDate,
                reason,
                status: "รออนุมัติ",
                createdAt: new Date(),
                attachment: compressedAttachments[0] || null, // Legacy support
                attachments: compressedAttachments,
            };

            if (isHourly) {
                payload.isHourly = true;
                payload.hours = parseFloat(hours.toFixed(2));
                payload.hourlyStart = hourlyStartTime;
                payload.hourlyEnd = hourlyEndTime;
            }

            await leaveService.create(payload);

            // Notify
            const messageData = {
                type: leaveType as string,
                start: finalStartDate,
                end: finalEndDate,
                reason,
                isHourly,
                hours: isHourly ? parseFloat(hours.toFixed(2)) : undefined,
                startStr: isHourly ? hourlyStartTime : undefined,
                endStr: isHourly ? hourlyEndTime : undefined
            };

            await sendFlexMessage(messageData);
            await notifyAdmin(messageData);

            setShowSuccess(true);

            // Reset
            setLeaveType("");
            setDailyStartDate("");
            setDailyEndDate("");
            setHourlyDate("");
            setHourlyStartTime("");
            setHourlyEndTime("");
            setReason("");
            setAttachments([]);
            setOverrideHours("");
            setTimeout(() => setShowSuccess(false), 3000);

        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            <EmployeeHeader />

            {/* Success Notification */}
            {showSuccess && (
                <div className="fixed top-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-top-10 fade-in duration-300">
                    <div className="bg-[#1DB446] text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 mx-auto max-w-sm">
                        <div className="p-2 bg-white/20 rounded-full">
                            <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">ส่งคำขอสำเร็จ!</h3>
                            <p className="text-white/90 text-sm">ระบบได้รับข้อมูลเรียบร้อยแล้ว</p>
                        </div>
                    </div>
                </div>
            )}

            <main className="px-4 -mt-6 relative z-10">
                <div className="bg-white rounded-3xl p-4 shadow-lg border border-gray-100">
                    <h2 className="text-md font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        แบบฟอร์มขอลางาน
                    </h2>

                    {/* Quota Cards */}
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                            <div className="text-xs text-blue-600 font-medium mb-1">ลากิจ</div>
                            <div className="text-xl font-bold text-blue-700">{Number(quotas.personal.remaining).toFixed(1)}</div>
                            <div className="text-[10px] text-blue-400">วัน</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
                            <div className="text-xs text-orange-600 font-medium mb-1">ลาป่วย</div>
                            <div className="text-xl font-bold text-orange-700">{Number(quotas.sick.remaining).toFixed(1)}</div>
                            <div className="text-[10px] text-orange-400">วัน</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-center">
                            <div className="text-xs text-purple-600 font-medium mb-1">พักร้อน</div>
                            <div className="text-xl font-bold text-purple-700">{Number(quotas.vacation.remaining).toFixed(1)}</div>
                            <div className="text-[10px] text-purple-400">วัน</div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Mode Toggle */}
                        <div className="bg-gray-100 p-1 rounded-xl flex">
                            <button
                                type="button"
                                onClick={() => setIsHourly(false)}
                                className={cn(
                                    "flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                                    !isHourly ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <Calendar className="w-4 h-4" /> ลาเต็มวัน
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsHourly(true)}
                                className={cn(
                                    "flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                                    isHourly ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <Clock className="w-4 h-4" /> ลารายชั่วโมง
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">ประเภทการลา</label>
                            <Select onValueChange={val => setLeaveType(val as LeaveType | "")} value={leaveType}>
                                <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-gray-50/50">
                                    <SelectValue placeholder="เลือกประเภท" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ลาป่วย">ลาป่วย</SelectItem>
                                    <SelectItem value="ลากิจ">ลากิจ</SelectItem>
                                    <SelectItem value="ลาพักร้อน">ลาพักร้อน</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Separate Logic for Fields */}
                        {isHourly ? (
                            // --- HOURLY MODE FIELDS (Single Date) ---
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">วันที่ลา</label>
                                    <Input
                                        type="date"
                                        value={hourlyDate}
                                        onChange={(e) => setHourlyDate(e.target.value)}
                                        className="h-12 w-full rounded-xl border-gray-200 bg-gray-50/50 appearance-none"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">เวลาเริ่ม</label>
                                        <Input
                                            type="time"
                                            value={hourlyStartTime}
                                            onChange={(e) => setHourlyStartTime(e.target.value)}
                                            className="h-12 w-full rounded-xl border-gray-200 bg-gray-50/50"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">ถึงเวลา</label>
                                        <Input
                                            type="time"
                                            value={hourlyEndTime}
                                            onChange={(e) => setHourlyEndTime(e.target.value)}
                                            className="h-12 w-full rounded-xl border-gray-200 bg-gray-50/50"
                                            required
                                        />
                                    </div>
                                </div>
                                {hourlyDate && hourlyStartTime && hourlyEndTime && (
                                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-semibold text-blue-900">ระยะเวลาลาสุทธิ:</span>
                                            <span className="text-sm font-bold text-blue-700">{getDurationDisplay()}</span>
                                        </div>

                                        <div className="pt-2 border-t border-blue-200/50">
                                            <div className="flex items-center gap-3">
                                                <label className="text-xs text-blue-800 font-medium whitespace-nowrap flex-1">
                                                    ระบุจำนวนชั่วโมงรวม (ถ้าคำนวณผิด):
                                                </label>
                                                <div className="relative w-24">
                                                    <Input
                                                        type="number"
                                                        step="0.5"
                                                        min="0"
                                                        placeholder={calculatedHours.toString()}
                                                        value={overrideHours}
                                                        onChange={(e) => setOverrideHours(e.target.value)}
                                                        className="h-9 text-right pr-8 bg-white border-blue-200 focus:border-blue-400 text-blue-900 font-medium"
                                                    />
                                                    <span className="absolute right-2 top-2.5 text-[10px] text-gray-400 pointer-events-none">ชม.</span>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-blue-400 mt-1">* 8 ชั่วโมง = 1 วันทำงาน</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // --- DAILY MODE FIELDS ---
                            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">วันที่เริ่ม</label>
                                    <Input
                                        type="date"
                                        value={dailyStartDate}
                                        onChange={(e) => setDailyStartDate(e.target.value)}
                                        className="h-12 w-full min-w-0 rounded-xl border-gray-200 bg-gray-50/50 appearance-none"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">ถึงวันที่</label>
                                    <Input
                                        type="date"
                                        value={dailyEndDate}
                                        onChange={(e) => setDailyEndDate(e.target.value)}
                                        className="h-12 w-full min-w-0 rounded-xl border-gray-200 bg-gray-50/50 appearance-none"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">เหตุผล</label>
                            <Textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="ระบุเหตุผลการลา..."
                                className="min-h-[100px] rounded-xl border-gray-200 bg-gray-50/50 resize-none"
                                required
                            />
                        </div>

                        {/* Attachment */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">แนบหลักฐาน (เลือกได้หลายไฟล์)</label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        const newFiles = Array.from(e.target.files);
                                        newFiles.forEach(file => {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                                if (ev.target?.result) {
                                                    setAttachments(prev => [...prev, ev.target!.result as string]);
                                                }
                                            };
                                            reader.readAsDataURL(file);
                                        });
                                    }
                                }}
                            />

                            {/* Attachments Preview Grid */}
                            {attachments.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    {attachments.map((att, index) => (
                                        <div key={index} className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                                            <img src={att} alt={`Attachment ${index + 1}`} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                                                className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-full hover:bg-red-600 backdrop-blur-sm"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center gap-2 text-gray-500 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                            >
                                <Camera className="w-8 h-8" />
                                <span className="text-sm">
                                    {attachments.length > 0 ? "เพิ่มรูปภาพอีก" : "แตะเพื่อเลือกรูปภาพ"}
                                </span>
                            </button>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 text-lg rounded-2xl bg-primary-dark hover:bg-primary-dark shadow-lg shadow-blue-900/20 mt-4"
                        >
                            {loading ? "กำลังส่งข้อมูล..." : (
                                <span className="flex items-center gap-2">
                                    ส่งคำขอ <Send className="w-4 h-4" />
                                </span>
                            )}
                        </Button>
                    </form>
                </div>
            </main>
        </div>
    );
}
