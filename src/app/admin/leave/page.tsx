"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { LeaveTable } from "@/components/leave/LeaveTable";
import { LeaveFormModal } from "@/components/leave/LeaveFormModal";
import { Button } from "@/components/ui/button";
import { Pencil, Plus } from "lucide-react";
import { leaveService, type LeaveRequest, employeeService, adminService } from "@/lib/firestore";
import { sendPushMessage } from "@/app/actions/line";
import { auth } from "@/lib/firebase";
import { CustomAlert } from "@/components/ui/custom-alert";

export default function LeavePage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [statusFilter, setStatusFilter] = useState<"all" | "รออนุมัติ" | "อนุมัติ" | "ไม่อนุมัติ">("all");
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

    const [rejectModal, setRejectModal] = useState<{
        isOpen: boolean;
        leaveId: string | null;
        reason: string;
    }>({
        isOpen: false,
        leaveId: null,
        reason: ""
    });

    const loadLeaves = async () => {
        try {
            // Fetch Pending and Recent (100) concurrently
            const [pendingData, recentData] = await Promise.all([
                leaveService.getPending(),
                leaveService.getRecent(100)
            ]);

            // Merge and deduplicate by ID
            const leaveMap = new Map<string, LeaveRequest>();
            pendingData.forEach(l => { if (l.id) leaveMap.set(l.id, l); });
            recentData.forEach(l => { if (l.id) leaveMap.set(l.id, l); });

            const mergedLeaves = Array.from(leaveMap.values())
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setLeaves(mergedLeaves);
        } catch (error) {
            console.error("Error loading leaves:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLeaves();

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

    const handleAddLeave = () => {
        setSelectedLeave(null);
        setIsModalOpen(true);
    };

    const handleEditLeave = (leave: LeaveRequest) => {
        setSelectedLeave(leave);
        setIsModalOpen(true);
    };

    const handleDeleteLeave = async (id: string) => {
        try {
            await leaveService.delete(id);
            loadLeaves();
        } catch (error) {
            console.error("Error deleting leave:", error);
            setAlertState({
                isOpen: true,
                title: "ผิดพลาด",
                message: "เกิดข้อผิดพลาดในการลบคำขอลา",
                type: "error"
            });
        }
    };

    const handleSuccess = () => {
        loadLeaves();
    };

    const handleStatusUpdate = async (id: string, status: LeaveRequest["status"]) => {
        if (status === "ไม่อนุมัติ") {
            setRejectModal({
                isOpen: true,
                leaveId: id,
                reason: ""
            });
            return;
        }
        await processStatusUpdate(id, status);
    };

    const processStatusUpdate = async (id: string, status: LeaveRequest["status"], rejectionReason?: string) => {
        try {
            await leaveService.updateStatus(id, status, rejectionReason);

            // Find the request and employee to send notification
            const request = leaves.find(l => l.id === id);
            if (request) {
                const employee = await employeeService.getById(request.employeeId);
                if (employee && employee.lineUserId) {
                    const isApproved = status === "อนุมัติ";
                    const color = isApproved ? "#1DB446" : "#D32F2F";
                    const title = isApproved ? "อนุมัติคำขอลา" : "ไม่อนุมัติคำขอลา";

                    const startDate = request.startDate instanceof Date ? request.startDate : new Date(request.startDate);
                    const endDate = request.endDate instanceof Date ? request.endDate : new Date(request.endDate);
                    const dateStr = `${startDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`;

                    const flexContents: any[] = [
                        {
                            type: "box",
                            layout: "baseline",
                            spacing: "sm",
                            contents: [
                                {
                                    type: "text",
                                    text: "ประเภท",
                                    color: "#aaaaaa",
                                    size: "sm",
                                    flex: 1
                                },
                                {
                                    type: "text",
                                    text: request.leaveType,
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
                            altText: `ผลการพิจารณาการลา: ${status}`,
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

            loadLeaves();
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

    const handleConfirmReject = async () => {
        if (rejectModal.leaveId) {
            await processStatusUpdate(rejectModal.leaveId, "ไม่อนุมัติ", rejectModal.reason);
            setRejectModal({ isOpen: false, leaveId: null, reason: "" });
        }
    };

    // Calculate stats
    const stats = {
        pending: leaves.filter(l => l.status === "รออนุมัติ").length,
        approved: leaves.filter(l => l.status === "อนุมัติ").length,
        rejected: leaves.filter(l => l.status === "ไม่อนุมัติ").length,
        total: leaves.length,
    };

    return (
        <div>
            <PageHeader
                title="ข้อมูลการลา"
                subtitle={`${leaves.length} results found`}
                searchPlaceholder="Employee |"
                action={
                    <div className="flex gap-2">
                        <Button
                            onClick={handleAddLeave}
                            className="bg-primary-dark hover:bg-primary-dark/90 text-white rounded-xl px-6 gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            เพิ่มการลางาน
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
                    title="ทั้งหมด"
                    value={stats.total}
                    onClick={() => setStatusFilter("all")}
                    isActive={statusFilter === "all"}
                />
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-gray-100 border-t-primary rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-600 mt-4">กำลังโหลดข้อมูล...</p>
                </div>
            ) : (
                <LeaveTable
                    leaves={statusFilter === "all" ? leaves : leaves.filter(l => l.status === statusFilter)}
                    onStatusUpdate={handleStatusUpdate}
                    onEdit={handleEditLeave}
                    onDelete={handleDeleteLeave}
                    isSuperAdmin={isSuperAdmin}
                />
            )}

            <LeaveFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                leave={selectedLeave}
                onSuccess={handleSuccess}
            />

            {/* Reject Reason Modal */}
            {rejectModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">ระบุเหตุผลที่ไม่อนุมัติ</h3>
                        <textarea
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none text-sm transition-all resize-none h-32"
                            placeholder="กรุณาระบุเหตุผล..."
                            value={rejectModal.reason}
                            onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                            autoFocus
                        />
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setRejectModal({ isOpen: false, leaveId: null, reason: "" })}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleConfirmReject}
                                disabled={!rejectModal.reason.trim()}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-red-200"
                            >
                                ยืนยันไม่อนุมัติ
                            </button>
                        </div>
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
