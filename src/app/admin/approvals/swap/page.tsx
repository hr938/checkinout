"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { swapService, type SwapRequest } from "@/lib/firestore";
import { useAdmin } from "@/components/auth/AuthProvider";
import { ArrowLeftRight, Check, X } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default function SwapApprovalsPage() {
    const { user } = useAdmin();
    const [requests, setRequests] = useState<SwapRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<"all" | "รออนุมัติ" | "อนุมัติ" | "ไม่อนุมัติ">("all");

    useEffect(() => {
        if (user) {
            loadRequests();
        }
    }, [user]);

    const loadRequests = async () => {
        try {
            const data = await swapService.getAll();
            setRequests(data);
        } catch (error) {
            console.error("Error loading swap requests:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        setProcessing(id);
        try {
            await swapService.updateStatus(id, "อนุมัติ");
            loadRequests();
        } catch (error) {
            console.error("Error approving:", error);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (id: string) => {
        setProcessing(id);
        try {
            await swapService.updateStatus(id, "ไม่อนุมัติ");
            loadRequests();
        } catch (error) {
            console.error("Error rejecting:", error);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setProcessing(null);
        }
    };

    const getStatusBadge = (status: SwapRequest["status"]) => {
        switch (status) {
            case "รออนุมัติ":
                return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">รออนุมัติ</span>;
            case "อนุมัติ":
                return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">อนุมัติ</span>;
            case "ไม่อนุมัติ":
                return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">ไม่อนุมัติ</span>;
        }
    };

    // Stats
    const stats = {
        pending: requests.filter(r => r.status === "รออนุมัติ").length,
        approved: requests.filter(r => r.status === "อนุมัติ").length,
        rejected: requests.filter(r => r.status === "ไม่อนุมัติ").length,
        total: requests.length,
    };

    // Filtered requests
    const filteredRequests = statusFilter === "all"
        ? requests
        : requests.filter(r => r.status === statusFilter);

    if (!user) {
        return <div className="p-8 text-center">กรุณาเข้าสู่ระบบ</div>;
    }

    return (
        <div className="flex-1 p-8">
            <PageHeader
                title="สลับวันหยุด"
                subtitle={`${requests.length} รายการทั้งหมด`}
            />

            {/* Clickable Stats Cards */}
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
                    <div className="w-12 h-12 border-4 border-gray-100 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-600 mt-4">กำลังโหลดข้อมูล...</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">พนักงาน</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">มาทำวันที่</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">หยุดแทนวันที่</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">เหตุผล</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">สถานะ</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRequests.map(request => (
                                <tr key={request.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                                <ArrowLeftRight className="w-5 h-5 text-purple-600" />
                                            </div>
                                            <span className="font-medium text-gray-800">{request.employeeName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-sm">
                                            {format(new Date(request.workDate), "d MMM yyyy", { locale: th })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-sm">
                                            {format(new Date(request.holidayDate), "d MMM yyyy", { locale: th })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">
                                        {request.reason || "-"}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(request.status)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {request.status === "รออนุมัติ" ? (
                                            <div className="flex justify-center gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => request.id && handleApprove(request.id)}
                                                    disabled={processing === request.id}
                                                    className="bg-green-600 hover:bg-green-700 h-8"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => request.id && handleReject(request.id)}
                                                    disabled={processing === request.id}
                                                    className="text-red-600 hover:bg-red-50 h-8"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="text-center text-gray-400 text-sm">-</div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredRequests.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        ไม่มีข้อมูลสลับวันหยุด
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
