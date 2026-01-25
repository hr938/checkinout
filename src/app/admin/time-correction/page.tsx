"use client";

import { useEffect, useState } from "react";
import { timeRequestService, type TimeRequest, attendanceService, type Attendance, adminLogService } from "@/lib/firestore";
import { useAdmin } from "@/components/auth/AuthProvider";
import { CustomAlert } from "@/components/ui/custom-alert";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CheckCircle, XCircle, Clock, Calendar, Image as ImageIcon, X } from "lucide-react";

export default function TimeCorrectionPage() {
    const { user } = useAdmin();
    const [requests, setRequests] = useState<TimeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<"all" | "รออนุมัติ" | "อนุมัติ" | "ไม่อนุมัติ">("all");
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [alertState, setAlertState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: "success" | "error" | "warning" | "info";
    }>({
        isOpen: false,
        title: "",
        message: "",
        type: "info"
    });

    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: "approve" | "reject";
        requestId: string | null;
        reason: string;
    }>({
        isOpen: false,
        type: "approve",
        requestId: null,
        reason: ""
    });

    const loadRequests = async () => {
        try {
            setLoading(true);
            const pendingData = await timeRequestService.getPending();
            setRequests(pendingData);
        } catch (error) {
            console.error("Error loading requests:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const handleActionClick = (id: string, type: "approve" | "reject") => {
        setActionModal({
            isOpen: true,
            type,
            requestId: id,
            reason: ""
        });
    };

    const handleConfirmAction = async () => {
        if (!actionModal.requestId) return;

        const { requestId, type, reason } = actionModal;

        try {
            const status = type === "approve" ? "อนุมัติ" : "ไม่อนุมัติ";

            // Update Request Status
            // Note: firestore.ts might need to support saving admin note/reason even for approval if supported, 
            // but usually we pass rejectionReason. For approval, we use reason in Attendance Note.
            await timeRequestService.updateStatus(requestId, status, reason);

            if (type === "approve") {
                const req = requests.find(r => r.id === requestId);
                if (req) {
                    try {
                        const startOfDay = new Date(req.date); startOfDay.setHours(0, 0, 0, 0);
                        const endOfDay = new Date(req.date); endOfDay.setHours(23, 59, 59, 999);
                        const history = await attendanceService.getHistory(req.employeeId, startOfDay, endOfDay);

                        const targetStatus = req.type;
                        const existingRecord = history.find(h => h.status === targetStatus);

                        const note = `คำขอปรับเวลา${reason ? `: ${reason}` : ""}`;

                        if (existingRecord && existingRecord.id) {
                            // Update existing
                            const updates: Partial<Attendance> = { locationNote: note };
                            if (req.type === "เข้างาน") updates.checkIn = req.time;
                            if (req.type === "ออกงาน") updates.checkOut = req.time;
                            if (req.type.includes("พัก")) updates.checkIn = req.time;

                            await attendanceService.update(existingRecord.id, updates);
                        } else {
                            // Create new
                            const newAtt: any = {
                                employeeId: req.employeeId,
                                employeeName: req.employeeName,
                                date: req.date,
                                status: targetStatus,
                                locationNote: note
                            };
                            if (req.type === "เข้างาน") newAtt.checkIn = req.time;
                            else if (req.type === "ออกงาน") newAtt.checkOut = req.time;
                            else newAtt.checkIn = req.time;

                            await attendanceService.create(newAtt);
                        }
                    } catch (err) {
                        console.error("Error auto-creating attendance:", err);
                    }
                }
            }

            // Log Activity
            const req = requests.find(r => r.id === requestId);
            if (req && user) {
                await adminLogService.create({
                    adminId: user.uid,
                    adminName: user.email || "Admin",
                    action: type,
                    module: "attendance",
                    target: req.employeeName,
                    details: `${type} การปรับเวลาของ ${req.employeeName} (${req.type})${reason ? ` เหตุผล: ${reason}` : ""}`
                });
            }

            setActionModal(prev => ({ ...prev, isOpen: false }));

            setAlertState({
                isOpen: true,
                title: "สำเร็จ",
                message: `ดำเนินการ${status}เรียบร้อยแล้ว`,
                type: "success"
            });

            loadRequests();
        } catch (error) {
            console.error("Error updating status:", error);
            setAlertState({
                isOpen: true,
                title: "ผิดพลาด",
                message: "เกิดข้อผิดพลาดในการอัพเดทสถานะ",
                type: "error"
            });
        }
    };

    // Stats
    const stats = {
        pending: requests.filter(r => r.status === "รออนุมัติ").length,
        approved: requests.filter(r => r.status === "อนุมัติ").length,
        rejected: requests.filter(r => r.status === "ไม่อนุมัติ").length,
        total: requests.length,
    };

    const filteredRequests = statusFilter === "all" ? requests : requests.filter(r => r.status === statusFilter);

    return (
        <div>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">จัดการการปรับเวลา</h1>
                    <p className="text-sm text-gray-500 mt-1">อนุมัติคำขอแก้เวลาและลงเวลาย้อนหลัง</p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                    { label: "ทั้งหมด", value: stats.total, color: "gray", active: statusFilter === "all", onClick: () => setStatusFilter("all") },
                    { label: "รอพิจารณา", value: stats.pending, color: "yellow", active: statusFilter === "รออนุมัติ", onClick: () => setStatusFilter(statusFilter === "รออนุมัติ" ? "all" : "รออนุมัติ") },
                    { label: "อนุมัติแล้ว", value: stats.approved, color: "green", active: statusFilter === "อนุมัติ", onClick: () => setStatusFilter(statusFilter === "อนุมัติ" ? "all" : "อนุมัติ") },
                    { label: "ไม่อนุมัติ", value: stats.rejected, color: "red", active: statusFilter === "ไม่อนุมัติ", onClick: () => setStatusFilter(statusFilter === "ไม่อนุมัติ" ? "all" : "ไม่อนุมัติ") },
                ].map((stat, idx) => (
                    <div
                        key={idx}
                        onClick={stat.onClick}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1
                            ${stat.active
                                ? `bg-${stat.color}-50 border-${stat.color}-200 ring-1 ring-${stat.color}-200`
                                : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
                            }`}
                    >
                        <span className={`text-[10px] uppercase tracking-wider font-semibold ${stat.active ? `text-${stat.color}-700` : "text-gray-500"}`}>
                            {stat.label}
                        </span>
                        <span className={`text-2xl font-bold ${stat.active ? `text-${stat.color}-700` : "text-gray-900"}`}>
                            {stat.value}
                        </span>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 font-medium">พนักงาน</th>
                                <th className="px-6 py-4 font-medium">ประเภท</th>
                                <th className="px-6 py-4 font-medium">วันที่/เวลา</th>
                                <th className="px-6 py-4 font-medium">เหตุผล</th>
                                <th className="px-6 py-4 font-medium">หลักฐาน</th>
                                <th className="px-6 py-4 font-medium">สถานะ</th>
                                <th className="px-6 py-4 font-medium text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        ไม่มีรายการคำขอ
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{req.employeeName}</div>
                                            <div className="text-xs text-gray-400">ID: {req.employeeId}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${req.type === 'เข้างาน' ? 'bg-green-50 text-green-700' :
                                                req.type === 'ออกงาน' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
                                                }`}>
                                                {req.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {format(req.date instanceof Date ? req.date : (req.date as any).toDate(), "d MMM yy", { locale: th })}
                                                </div>
                                                <div className="flex items-center gap-2 text-gray-900 font-medium">
                                                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                                                    {format(req.time instanceof Date ? req.time : (req.time as any).toDate(), "HH:mm")}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                                            {req.reason}
                                        </td>
                                        <td className="px-6 py-4">
                                            {req.attachment ? (
                                                <button
                                                    onClick={() => setViewingImage(req.attachment || null)}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-medium transition-colors"
                                                >
                                                    <ImageIcon className="w-3.5 h-3.5" />
                                                    ดูรูป
                                                </button>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${req.status === 'อนุมัติ'
                                                ? 'bg-green-50 text-green-700 border-green-100'
                                                : req.status === 'ไม่อนุมัติ'
                                                    ? 'bg-red-50 text-red-700 border-red-100'
                                                    : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${req.status === 'อนุมัติ' ? 'bg-green-500' : req.status === 'ไม่อนุมัติ' ? 'bg-red-500' : 'bg-yellow-500'
                                                    }`} />
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {req.status === 'รออนุมัติ' && (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleActionClick(req.id!, 'approve')}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors tooltip"
                                                        title="อนุมัติ"
                                                    >
                                                        <CheckCircle className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleActionClick(req.id!, 'reject')}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip"
                                                        title="ไม่อนุมัติ"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Confirmation Modal */}
            {actionModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${actionModal.type === 'approve' ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {actionModal.type === 'approve' ? (
                                <><CheckCircle className="w-5 h-5" /> ยืนยันการอนุมัติ</>
                            ) : (
                                <><XCircle className="w-5 h-5" /> ยืนยันการปฏิเสธคำขอ</>
                            )}
                        </h3>

                        <p className="text-sm text-gray-500 mb-3">
                            {actionModal.type === 'approve'
                                ? 'คุณสามารถระบุเหตุผลหรือหมายเหตุการอนุมัติได้ (ถ้ามี)'
                                : 'คุณสามารถระบุเหตุผลที่ไม่อนุมัติได้ (ถ้ามี)'}
                        </p>

                        <textarea
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm transition-all resize-none h-32"
                            placeholder={actionModal.type === 'approve' ? "ระบุหมายเหตุ (ไม่บังคับ)..." : "ระบุเหตุผล (ไม่บังคับ)..."}
                            value={actionModal.reason}
                            onChange={(e) => setActionModal(prev => ({ ...prev, reason: e.target.value }))}
                            autoFocus
                        />

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleConfirmAction}
                                className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors shadow-lg ${actionModal.type === 'approve'
                                        ? "bg-green-600 hover:bg-green-700 shadow-green-200"
                                        : "bg-red-600 hover:bg-red-700 shadow-red-200"
                                    }`}
                            >
                                {actionModal.type === 'approve' ? 'ยืนยันอนุมัติ' : 'ยืนยันปฏิเสธ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Preview Modal */}
            {viewingImage && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                    onClick={() => setViewingImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] w-full">
                        <button
                            onClick={() => setViewingImage(null)}
                            className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <img
                            src={viewingImage}
                            alt="Evidence"
                            className="w-full h-full object-contain max-h-[90vh] rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}

            <CustomAlert
                isOpen={alertState.isOpen}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
            />
        </div>
    );
}
