import { useState } from "react";
import { cn } from "@/lib/utils";
import { type LeaveRequest } from "@/lib/firestore";
import { Check, X, Edit2, Trash2, Image as ImageIcon, X as CloseIcon } from "lucide-react";
import { format } from "date-fns";

interface LeaveTableProps {
    leaves: LeaveRequest[];
    onStatusUpdate: (id: string, status: LeaveRequest["status"]) => void;
    onEdit?: (leave: LeaveRequest) => void;
    onDelete?: (id: string) => void;
    isSuperAdmin?: boolean;
}

export function LeaveTable({ leaves, onStatusUpdate, onEdit, onDelete, isSuperAdmin = false }: LeaveTableProps) {
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    return (
        <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-left">
                                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[20%]">ชื่อ-นามสกุล</th>
                                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-[12%]">ประเภท</th>
                                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[20%]">ช่วงวันที่ลา</th>
                                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-[10%]">จำนวน</th>
                                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[20%]">เหตุผล</th>
                                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-[8%]">หลักฐาน</th>
                                <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-[10%]">สถานะ</th>
                                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-[10%]">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {leaves.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-gray-500">
                                        ไม่มีข้อมูลการลา
                                    </td>
                                </tr>
                            ) : (
                                leaves.map((leave) => (
                                    <tr key={leave.id} className="hover:bg-gray-50/40 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm border border-blue-100">
                                                    {leave.employeeName.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900">{leave.employeeName}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-[11px] font-semibold border",
                                                leave.leaveType === "ลาพักร้อน" ? "bg-sky-50 text-sky-700 border-sky-100" :
                                                    leave.leaveType === "ลาป่วย" ? "bg-rose-50 text-rose-700 border-rose-100" :
                                                        "bg-amber-50 text-amber-700 border-amber-100"
                                            )}>
                                                {leave.leaveType}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="w-8 text-gray-400">เริ่ม:</span>
                                                    <span className="font-medium text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded">
                                                        {leave.startDate ? format(leave.startDate, "d MMM yy") : "-"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="w-8 text-gray-400">ถึง:</span>
                                                    <span className="font-medium text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded">
                                                        {leave.endDate ? format(leave.endDate, "d MMM yy") : "-"}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-50 text-gray-700 border border-gray-100">
                                                {leave.startDate && leave.endDate
                                                    ? Math.max(1, Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
                                                    : "-"} วัน
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="max-w-[200px] relative group/tooltip">
                                                <p className="text-sm text-gray-600 truncate cursor-help">
                                                    {leave.reason || "-"}
                                                </p>
                                                {leave.reason && leave.reason.length > 30 && (
                                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block z-20 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg pointer-events-none">
                                                        {leave.reason}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            {leave.attachment ? (
                                                <button
                                                    onClick={() => setViewingImage(leave.attachment || null)}
                                                    className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                                                    title="ดูหลักฐาน"
                                                >
                                                    <ImageIcon className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <span className="text-gray-300 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className={cn(
                                                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                                                leave.status === "รออนุมัติ" ? "bg-orange-100 text-orange-700" :
                                                    leave.status === "อนุมัติ" ? "bg-green-100 text-green-700" :
                                                        "bg-red-100 text-red-700"
                                            )}>
                                                {leave.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {/* Approve/Reject buttons for pending requests */}
                                                {leave.status === "รออนุมัติ" && leave.id && (
                                                    <>
                                                        <button
                                                            onClick={() => onStatusUpdate(leave.id!, "อนุมัติ")}
                                                            className="p-1.5 hover:bg-green-50 text-gray-400 hover:text-green-600 rounded-lg transition-colors border border-transparent hover:border-green-200"
                                                            title="อนุมัติ"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => onStatusUpdate(leave.id!, "ไม่อนุมัติ")}
                                                            className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                                            title="ไม่อนุมัติ"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}

                                                {/* Edit and Delete buttons for super_admin */}
                                                {isSuperAdmin && leave.id && (
                                                    <>
                                                        {onEdit && (
                                                            <button
                                                                onClick={() => onEdit(leave)}
                                                                className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                                                                title="แก้ไข"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {onDelete && (
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm(`คุณต้องการลบคำขอลาของ ${leave.employeeName} ใช่หรือไม่?`)) {
                                                                        onDelete(leave.id!);
                                                                    }
                                                                }}
                                                                className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                                                                title="ลบ"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

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
                            <CloseIcon className="w-8 h-8" />
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
        </>
    );
}
