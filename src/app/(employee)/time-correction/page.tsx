"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; // Assuming Textarea is available
import { timeRequestService } from "@/lib/firestore";
import { EmployeeHeader } from "@/components/mobile/EmployeeHeader";
import { useEmployee } from "@/contexts/EmployeeContext";
import { Clock, History, Camera, CheckCircle, Send, FileText, Calendar, X } from "lucide-react"; // Added Icons
import { cn } from "@/lib/utils";
import { compressBase64Image } from "@/lib/storage";

export default function TimeCorrectionPage() {
    const { employee } = useEmployee();
    const [requestDate, setRequestDate] = useState("");
    const [requestTime, setRequestTime] = useState("");
    const [type, setType] = useState<"เข้างาน" | "ออกงาน" | "ก่อนพัก" | "หลังพัก" | "">("");
    const [reason, setReason] = useState("");
    const [attachment, setAttachment] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const sendFlexMessage = async (data: { type: string, date: Date, time: string, reason: string }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const liff = (window as any).liff;
        if (liff && liff.isInClient()) {
            try {
                const dateText = data.date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

                await liff.sendMessages([{
                    type: "flex",
                    altText: "ส่งคำขอปรับเวลาสำเร็จ",
                    contents: {
                        type: "bubble",
                        header: {
                            type: "box", layout: "vertical",
                            contents: [
                                { type: "text", text: "ส่งคำขอสำเร็จ", weight: "bold", color: "#F59E0B", size: "sm" },
                                { type: "text", text: "ปรับเวลา (Time Correction)", weight: "bold", size: "lg", margin: "md" }
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
                                                { type: "text", text: data.type, wrap: true, color: "#666666", size: "sm", flex: 4 }
                                            ]
                                        },
                                        {
                                            type: "box", layout: "baseline", spacing: "sm",
                                            contents: [
                                                { type: "text", text: "เวลาที่ขอ", color: "#aaaaaa", size: "sm", flex: 1 },
                                                { type: "text", text: `${dateText} เวลา ${data.time}`, wrap: true, color: "#666666", size: "sm", flex: 4 }
                                            ]
                                        },
                                        {
                                            type: "box", layout: "baseline", spacing: "sm",
                                            contents: [
                                                { type: "text", text: "เหตุผล", color: "#aaaaaa", size: "sm", flex: 1 },
                                                { type: "text", text: data.reason, wrap: true, color: "#666666", size: "sm", flex: 4 }
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

    const notifyAdmin = async (data: { type: string, date: Date, time: string, reason: string }) => {
        try {
            const dateText = data.date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
            const detailText = `ขอปรับเวลา (${data.type}): วันที่ ${dateText} เวลา ${data.time}`;

            await fetch("/api/line/notify-admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "time_correction",
                    employeeName: employee?.name || "Unknown",
                    details: detailText,
                    reason: data.reason,
                    date: new Date().toISOString()
                }),
            });
        } catch (error) {
            console.error("Error notifying admin:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employee || !type || !requestDate || !requestTime) {
            alert("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }

        setLoading(true);
        try {
            const dateTimeString = `${requestDate}T${requestTime}`;
            const timeDate = new Date(dateTimeString);

            // Compress Attachment
            let compressedAttachment: string | undefined = undefined;
            if (attachment) {
                try {
                    compressedAttachment = await compressBase64Image(attachment, 1280, 1280, 0.7);
                } catch (e) {
                    console.error("Compression failed", e);
                    compressedAttachment = attachment; // Fallback
                }
            }

            await timeRequestService.create({
                employeeId: employee.id!,
                employeeName: employee.name,
                date: new Date(requestDate),
                type,
                time: timeDate,
                reason,
                attachment: compressedAttachment,
                status: "รออนุมัติ",
                createdAt: new Date(),
            });

            // Notify
            const notifyData = {
                type,
                date: new Date(requestDate),
                time: requestTime,
                reason
            };
            await sendFlexMessage(notifyData);
            await notifyAdmin(notifyData);

            setShowSuccess(true);

            // Reset Form
            setRequestDate("");
            setRequestTime("");
            setType("");
            setReason("");
            setAttachment(null);
            setTimeout(() => setShowSuccess(false), 3000);

        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachment(reader.result as string);
            };
            reader.readAsDataURL(file);
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
                <div className="bg-white rounded-3xl p-4 shadow-lg border border-gray-100 mb-6">
                    <h2 className="text-md font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <History className="w-5 h-5 text-orange-500" />
                        ขอปรับเวลา/ลงเวลาย้อนหลัง
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">วันที่ต้องการแก้ไข</label>
                            <Input
                                type="date"
                                value={requestDate}
                                onChange={(e) => setRequestDate(e.target.value)}
                                className="h-12 w-full rounded-xl border-gray-200 bg-gray-50/50 appearance-none"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">ประเภท</label>
                                <Select onValueChange={(v: any) => setType(v)} value={type}>
                                    <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-gray-50/50">
                                        <SelectValue placeholder="เลือก..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="เข้างาน">เข้างาน</SelectItem>
                                        <SelectItem value="ออกงาน">ออกงาน</SelectItem>
                                        <SelectItem value="ก่อนพัก">ก่อนพัก</SelectItem>
                                        <SelectItem value="หลังพัก">หลังพัก</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">เวลาที่ถูกต้อง</label>
                                <Input
                                    type="time"
                                    value={requestTime}
                                    onChange={(e) => setRequestTime(e.target.value)}
                                    className="h-12 w-full rounded-xl border-gray-200 bg-gray-50/50 appearance-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">เหตุผลที่ต้องการแก้ไข</label>
                            <Textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="เช่น ลืมลงชื่อเข้างาน, ระบบขัดข้อง, ลงเวลาผิด..."
                                className="min-h-[100px] rounded-xl border-gray-200 bg-gray-50/50 resize-none"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">หลักฐานภาพถ่าย (ถ้ามี)</label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-gray-400 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer min-h-[120px]"
                            >
                                {attachment ? (
                                    <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                                        <img src={attachment} alt="Preview" className="w-full h-full object-contain" />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAttachment(null);
                                            }}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Camera className="w-8 h-8 opacity-50" />
                                        <span className="text-xs">แตะเพื่อถ่ายภาพหรือเลือกรูป</span>
                                    </>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 text-lg rounded-2xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 mt-4"
                        >
                            {loading ? "กำลังบันทึก..." : (
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
