"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { OTTable } from "@/components/ot/OTTable";
import { OTFormModal } from "@/components/ot/OTFormModal";
import { Button } from "@/components/ui/button";
import { Pencil, Plus } from "lucide-react";
import { otService, type OTRequest, employeeService, adminService } from "@/lib/firestore";
import { sendPushMessage } from "@/app/actions/line";
import { auth } from "@/lib/firebase";

export default function OTPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOT, setSelectedOT] = useState<OTRequest | null>(null);
    const [otRequests, setOTRequests] = useState<OTRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [statusFilter, setStatusFilter] = useState<"all" | "รออนุมัติ" | "อนุมัติ" | "ไม่อนุมัติ">("all");

    const [rejectModal, setRejectModal] = useState<{
        isOpen: boolean;
        otId: string | null;
        reason: string;
    }>({
        isOpen: false,
        otId: null,
        reason: ""
    });

    const loadOTRequests = async () => {
        try {
            // Fetch Pending and Recent (100) concurrently
            const [pendingData, recentData] = await Promise.all([
                otService.getPending(),
                otService.getRecent(100)
            ]);

            // Merge and deduplicate by ID
            const otMap = new Map<string, OTRequest>();
            pendingData.forEach(o => { if (o.id) otMap.set(o.id, o); });
            recentData.forEach(o => { if (o.id) otMap.set(o.id, o); });

            const mergedOTs = Array.from(otMap.values())
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setOTRequests(mergedOTs);
        } catch (error) {
            console.error("Error loading OT requests:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOTRequests();

        // Check if current user is super_admin
        const checkAdminRole = async () => {
            const user = auth.currentUser;
            if (user?.email) {
                const admin = await adminService.getByEmail(user.email);
                if (admin?.role === "super_admin") {
                    setIsSuperAdmin(true);
                }
            }
        };
        checkAdminRole();
    }, []);

    const handleAddOT = () => {
        setSelectedOT(null);
        setIsModalOpen(true);
    };

    const handleEditOT = (ot: OTRequest) => {
        setSelectedOT(ot);
        setIsModalOpen(true);
    };

    const handleDeleteOT = async (id: string) => {
        try {
            await otService.delete(id);
            loadOTRequests();
        } catch (error) {
            console.error("Error deleting OT:", error);
            alert("เกิดข้อผิดพลาดในการลบคำขอ OT");
        }
    };

    const handleSuccess = () => {
        loadOTRequests();
    };

    const handleStatusUpdate = async (id: string, status: OTRequest["status"]) => {
        if (status === "ไม่อนุมัติ") {
            setRejectModal({
                isOpen: true,
                otId: id,
                reason: ""
            });
            return;
        }
        await processStatusUpdate(id, status);
    };

    const processStatusUpdate = async (id: string, status: OTRequest["status"], rejectionReason?: string) => {
        try {
            await otService.updateStatus(id, status, rejectionReason);

            // Find the request and employee to send notification
            const request = otRequests.find(r => r.id === id);
            if (request) {
                const employee = await employeeService.getById(request.employeeId);
                if (employee && employee.lineUserId) {
                    const isApproved = status === "อนุมัติ";
                    const color = isApproved ? "#1DB446" : "#D32F2F";
                    const title = isApproved ? "อนุมัติคำขอ OT" : "ไม่อนุมัติคำขอ OT";

                    const dateStr = request.date instanceof Date
                        ? request.date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
                        : new Date(request.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

                    const startTime = request.startTime instanceof Date ? request.startTime : new Date(request.startTime);
                    const endTime = request.endTime instanceof Date ? request.endTime : new Date(request.endTime);
                    const timeStr = `${startTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;

                    const flexContents: any[] = [
                        {
                            type: "box",
                            layout: "baseline",
                            spacing: "sm",
                            contents: [
                                {
                                    type: "text",
                                    text: "วันที่",
                                    color: "#aaaaaa",
                                    size: "sm",
                                    flex: 1
                                },
                                {
                                    type: "text",
                                    text: dateStr,
                                    wrap: true,
                                    color: "#666666",
                                    size: "sm",
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: "box",
                            layout: "baseline",
                            spacing: "sm",
                            contents: [
                                {
                                    type: "text",
                                    text: "เวลา",
                                    color: "#aaaaaa",
                                    size: "sm",
                                    flex: 1
                                },
                                {
                                    type: "text",
                                    text: timeStr,
                                    wrap: true,
                                    color: "#666666",
                                    size: "sm",
                                    flex: 5
                                }
                            ]
                        },
                        {
                            type: "box",
                            layout: "baseline",
                            spacing: "sm",
                            contents: [
                                {
                                    type: "text",
                                    text: "สถานะ",
                                    color: "#aaaaaa",
                                    size: "sm",
                                    flex: 1
                                },
                                {
                                    type: "text",
                                    text: status,
                                    wrap: true,
                                    color: color,
                                    size: "sm",
                                    flex: 5,
                                    weight: "bold"
                                }
                            ]
                        }
                    ];

                    if (rejectionReason) {
                        flexContents.push({
                            type: "box",
                            layout: "baseline",
                            spacing: "sm",
                            contents: [
                                {
                                    type: "text",
                                    text: "เหตุผล",
                                    color: "#aaaaaa",
                                    size: "sm",
                                    flex: 1
                                },
                                {
                                    type: "text",
                                    text: rejectionReason,
                                    wrap: true,
                                    color: "#D32F2F",
                                    size: "sm",
                                    flex: 5
                                }
                            ]
                        });
                    }

                    await sendPushMessage(employee.lineUserId, [
                        {
                            type: "flex",
                            altText: `ผลการพิจารณา OT: ${status}`,
                            contents: {
                                type: "bubble",
                                header: {
                                    type: "box",
                                    layout: "vertical",
                                    contents: [
                                        {
                                            type: "text",
                                            text: title,
                                            weight: "bold",
                                            color: color,
                                            size: "lg"
                                        }
                                    ]
                                },
                                body: {
                                    type: "box",
                                    layout: "vertical",
                                    contents: [
                                        {
                                            type: "box",
                                            layout: "vertical",
                                            margin: "lg",
                                            spacing: "sm",
                                            contents: flexContents
                                        }
                                    ]
                                }
                            }
                        }
                    ]);
                }
            }

            loadOTRequests();
        } catch (error) {
            console.error("Error updating status:", error);
            alert("เกิดข้อผิดพลาดในการอัพเดทสถานะ");
        }
    };

    const handleConfirmReject = async () => {
        if (rejectModal.otId) {
            await processStatusUpdate(rejectModal.otId, "ไม่อนุมัติ", rejectModal.reason);
            setRejectModal({ isOpen: false, otId: null, reason: "" });
        }
    };

    // Calculate stats
    const stats = {
        pending: otRequests.filter(ot => ot.status === "รออนุมัติ").length,
        approved: otRequests.filter(ot => ot.status === "อนุมัติ").length,
        rejected: otRequests.filter(ot => ot.status === "ไม่อนุมัติ").length,
        totalHours: otRequests
            .filter(ot => ot.status === "อนุมัติ")
            .reduce((sum, ot) => {
                const start = ot.startTime instanceof Date ? ot.startTime : new Date(ot.startTime);
                const end = ot.endTime instanceof Date ? ot.endTime : new Date(ot.endTime);
                const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                return sum + hours;
            }, 0),
    };

    return (
        <div>
            <PageHeader
                title="ข้อมูลโอที"
                subtitle={`${otRequests.length} results found`}
                searchPlaceholder="Employee |"
                action={
                    <div className="flex gap-2">
                        <Button
                            onClick={handleAddOT}
                            className="bg-primary-dark hover:bg-primary-dark/90 text-white rounded-xl px-6 gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            เพิ่มข้อมูลโอที
                        </Button>

                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCard
                    title="รอการอนุมัติ"
                    value={stats.pending}
                    onClick={() => setStatusFilter(statusFilter === "รออนุมัติ" ? "all" : "รออนุมัติ")}
                    isActive={statusFilter === "รออนุมัติ"}
                />
                <StatsCard
                    title="อนุมัติ"
                    value={stats.approved}
                    onClick={() => setStatusFilter(statusFilter === "อนุมัติ" ? "all" : "อนุมัติ")}
                    isActive={statusFilter === "อนุมัติ"}
                />
                <StatsCard
                    title="ไม่อนุมัติ"
                    value={stats.rejected}
                    onClick={() => setStatusFilter(statusFilter === "ไม่อนุมัติ" ? "all" : "ไม่อนุมัติ")}
                    isActive={statusFilter === "ไม่อนุมัติ"}
                />
                <StatsCard
                    title="ชั่วโมง OT ทั้งหมด"
                    value={`${stats.totalHours.toFixed(1)} ชม.`}
                    onClick={() => setStatusFilter("all")}
                    isActive={statusFilter === "all"}
                />
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-[#EBDACA] border-t-[#553734] rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-600 mt-4">กำลังโหลดข้อมูล...</p>
                </div>
            ) : (
                <OTTable
                    otRequests={statusFilter === "all" ? otRequests : otRequests.filter(ot => ot.status === statusFilter)}
                    onStatusUpdate={handleStatusUpdate}
                    onEdit={handleEditOT}
                    onDelete={handleDeleteOT}
                    isSuperAdmin={isSuperAdmin}
                />
            )}

            <OTFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                ot={selectedOT}
                onSuccess={handleSuccess}
            />

            {/* Reject Reason Modal */}
            {rejectModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">ระบุเหตุผลที่ไม่อนุมัติ (ไม่บังคับ)</h3>
                        <textarea
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm transition-all resize-none h-32"
                            placeholder="กรุณาระบุเหตุผล (ถ้ามี)..."
                            value={rejectModal.reason}
                            onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                            autoFocus
                        />
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setRejectModal({ isOpen: false, otId: null, reason: "" })}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleConfirmReject}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                            >
                                ยืนยันไม่อนุมัติ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
