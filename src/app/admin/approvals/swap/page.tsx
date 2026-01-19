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
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-left">
                                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[25%]">ชื่อ-นามสกุล</th>
                                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[25%]">รายละเอียดการสลับ</th>
                                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[25%]">เหตุผล</th>
                                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-[15%]">สถานะ</th>
                                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-[10%]">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredRequests.map(request => (
                                <tr key={request.id} className="hover:bg-gray-50/40 transition-colors group">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-sm border border-purple-100">
                                                {request.employeeName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900">{request.employeeName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="w-16 text-gray-500">มาทำวันที่:</span>
                                                <span className="font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                                    {format(new Date(request.workDate), "d MMM yy", { locale: th })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="w-16 text-gray-500">หยุดแทน:</span>
                                                <span className="font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                                    {format(new Date(request.holidayDate), "d MMM yy", { locale: th })}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="max-w-[200px] relative group/tooltip">
                                            <p className="text-sm text-gray-600 truncate cursor-help">
                                                {request.reason || "-"}
                                            </p>
                                            {request.reason && request.reason.length > 30 && (
                                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block z-20 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg pointer-events-none">
                                                    {request.reason}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                                            ${request.status === "รออนุมัติ" ? "bg-orange-100 text-orange-700" :
                                                request.status === "อนุมัติ" ? "bg-green-100 text-green-700" :
                                                    "bg-red-100 text-red-700"}`}>
                                            {request.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        {request.status === "รออนุมัติ" ? (
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => request.id && handleApprove(request.id)}
                                                    disabled={processing === request.id}
                                                    className="p-1.5 hover:bg-green-50 text-gray-400 hover:text-green-600 rounded-lg transition-colors border border-transparent hover:border-green-200"
                                                    title="อนุมัติ"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => request.id && handleReject(request.id)}
                                                    disabled={processing === request.id}
                                                    className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                                    title="ไม่อนุมัติ"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-gray-300 text-xs text-center">-</div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredRequests.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-gray-500">
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
