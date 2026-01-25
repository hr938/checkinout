"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { swapService, type SwapRequest } from "@/lib/firestore";
import { useAdmin } from "@/components/auth/AuthProvider";
import { SwapFormModal } from "@/components/swap/SwapFormModal";
import { ArrowLeftRight, Check, X, User, Calendar, FileText, Edit2, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function SwapApprovalsPage() {
    const { user } = useAdmin();
    const [requests, setRequests] = useState<SwapRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<"all" | "รออนุมัติ" | "อนุมัติ" | "ไม่อนุมัติ">("all");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSwap, setSelectedSwap] = useState<SwapRequest | null>(null);

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

    const handleDelete = async (id: string) => {
        if (!confirm("คุณต้องการลบรายการนี้ใช่หรือไม่?")) return;
        try {
            await swapService.delete(id);
            loadRequests();
        } catch (error) {
            console.error("Error deleting:", error);
            alert("เกิดข้อผิดพลาดในการลบ");
        }
    };

    const handleAdd = () => {
        setSelectedSwap(null);
        setIsModalOpen(true);
    };

    const handleEdit = (swap: SwapRequest) => {
        setSelectedSwap(swap);
        setIsModalOpen(true);
    };

    const stats = {
        pending: requests.filter(r => r.status === "รออนุมัติ").length,
        approved: requests.filter(r => r.status === "อนุมัติ").length,
        rejected: requests.filter(r => r.status === "ไม่อนุมัติ").length,
        total: requests.length,
    };

    const filteredRequests = statusFilter === "all"
        ? requests
        : requests.filter(r => r.status === statusFilter);

    if (!user) {
        return <div className="p-8 text-center text-sm text-gray-500">กรุณาเข้าสู่ระบบ</div>;
    }

    return (
        <div className="flex-1 space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">รายการขอสลับวันหยุด</h1>
                    <p className="text-sm text-gray-500 mt-1">จัดการคำขอสลับวันหยุดงานของพนักงาน</p>
                </div>
                <div>
                    <Button
                        onClick={handleAdd}
                        className="w-full sm:w-auto bg-primary-dark hover:bg-primary-dark/90 text-white rounded-lg px-4 gap-2 h-10 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        เพิ่มรายการสลับวัน
                    </Button>
                </div>
            </div>

            {/* Stats Overview - Compact Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

            {loading ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-100 shadow-sm">
                    <div className="w-8 h-8 border-2 border-gray-100 border-t-purple-600 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[240px]">พนักงาน</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">วันทำงานที่ทำแทน</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">วันที่ต้องการหยุด</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[200px]">เหตุผล</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-[120px]">สถานะ</th>
                                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-[140px]">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                                                    <ArrowLeftRight className="w-6 h-6 text-gray-300" />
                                                </div>
                                                <p className="text-sm">ไม่มีข้อมูลการสลับวันหยุด</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map(request => (
                                        <tr key={request.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs border border-purple-200">
                                                        {request.employeeName?.charAt(0) || <User className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900 leading-none mb-1">{request.employeeName}</div>
                                                        <div className="text-[10px] text-gray-400">{request.employeeId || "-"}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-600">
                                                        <Calendar className="w-4 h-4" />
                                                    </span>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-gray-500">มาทำวันที่</span>
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {format(new Date(request.workDate), "d MMMM yyyy", { locale: th })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-600">
                                                        <Calendar className="w-4 h-4" />
                                                    </span>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-gray-500">หยุดแทนวันที่</span>
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {format(new Date(request.holidayDate), "d MMMM yyyy", { locale: th })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                {request.reason ? (
                                                    <div className="text-xs text-gray-600 line-clamp-2" title={request.reason}>
                                                        <FileText className="inline w-3 h-3 mr-1 align-middle text-gray-400" />
                                                        {request.reason}
                                                    </div>
                                                ) : <span className="text-xs text-gray-400">-</span>}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={cn(
                                                    "inline-flex items-center justify-center min-w-[80px] px-2.5 py-1 rounded-full text-[10px] font-semibold border",
                                                    request.status === "รออนุมัติ" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                        request.status === "อนุมัติ" ? "bg-green-50 text-green-700 border-green-200" :
                                                            "bg-red-50 text-red-700 border-red-200"
                                                )}>
                                                    {request.status === "รออนุมัติ" ? "⏳ รอพิจารณา" : request.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    {/* Approve/Reject Buttons */}
                                                    {request.status === "รออนุมัติ" && (
                                                        <>
                                                            <button
                                                                onClick={() => request.id && handleApprove(request.id)}
                                                                disabled={processing === request.id}
                                                                className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors border border-green-100 disabled:opacity-50"
                                                                title="อนุมัติ"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => request.id && handleReject(request.id)}
                                                                disabled={processing === request.id}
                                                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-100 disabled:opacity-50"
                                                                title="ไม่อนุมัติ"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* Admin Actions: Edit & Delete */}
                                                    <button
                                                        onClick={() => handleEdit(request)}
                                                        className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                                                        title="แก้ไข"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => request.id && handleDelete(request.id)}
                                                        className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                                                        title="ลบ"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <SwapFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                swap={selectedSwap}
                onSuccess={() => {
                    loadRequests();
                }}
            />
        </div>
    );
}
