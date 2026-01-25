import { useState } from "react";
import { cn } from "@/lib/utils";
import { type LeaveRequest } from "@/lib/firestore";
import { Check, X, Edit2, Trash2, Image as ImageIcon, X as CloseIcon, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[240px]">พนักงาน</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[140px]">ประเภทลา</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ระยะเวลา</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[200px]">หมายเหตุ/หลักฐาน</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[120px] text-center">สถานะ</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[120px] text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {leaves.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                                                <Calendar className="w-6 h-6 text-gray-300" />
                                            </div>
                                            <p className="text-sm">ไม่มีข้อมูลการลงเวลาในขณะนี้</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                leaves.map((leave) => {
                                    const daysCount = leave.startDate && leave.endDate
                                        ? Math.max(1, Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
                                        : 0;

                                    return (
                                        <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs border border-gray-200">
                                                        {leave.employeeName?.charAt(0) || <User className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900 leading-none mb-1">{leave.employeeName}</div>
                                                        <div className="text-[10px] text-gray-400">{leave.employeeId || "-"}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={cn(
                                                    "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border",
                                                    leave.leaveType === "ลาพักร้อน" ? "bg-sky-50 text-sky-700 border-sky-100" :
                                                        leave.leaveType === "ลาป่วย" ? "bg-rose-50 text-rose-700 border-rose-100" :
                                                            "bg-amber-50 text-amber-700 border-amber-100"
                                                )}>
                                                    {leave.leaveType}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                        {leave.isHourly ? (
                                                            <span>
                                                                {leave.startDate ? format(new Date(leave.startDate), "d MMM yy", { locale: th }) : "-"}
                                                                <span className="text-gray-400 font-normal mx-1">เวลา</span>
                                                                {leave.hourlyStart} - {leave.hourlyEnd}
                                                            </span>
                                                        ) : (
                                                            <span>
                                                                {leave.startDate ? format(new Date(leave.startDate), "d MMM yy", { locale: th }) : "-"}
                                                                <span className="text-gray-400 font-normal mx-1">ถึง</span>
                                                                {leave.endDate ? format(new Date(leave.endDate), "d MMM yy", { locale: th }) : "-"}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 pl-5">
                                                        รวม <span className="font-semibold text-gray-700">
                                                            {leave.isHourly && leave.hours
                                                                ? `${leave.hours} ชั่วโมง (${(leave.hours / 8).toFixed(2)} วัน)`
                                                                : `${leave.startDate && leave.endDate ? Math.max(1, Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 0} วัน`
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex flex-col gap-1">
                                                    {leave.reason ? (
                                                        <div className="text-xs text-gray-600 line-clamp-1" title={leave.reason}>
                                                            <span className="text-gray-400 mr-1.5 align-middle"><FileText className="inline w-3 h-3" /></span>
                                                            {leave.reason}
                                                        </div>
                                                    ) : <span className="text-xs text-gray-400">-</span>}

                                                    {leave.attachment && (
                                                        <button
                                                            onClick={() => setViewingImage(leave.attachment || null)}
                                                            className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 hover:underline w-fit"
                                                        >
                                                            <ImageIcon className="w-3 h-3" /> ดูหลักฐาน
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={cn(
                                                    "inline-flex items-center justify-center min-w-[80px] px-2.5 py-1 rounded-full text-[10px] font-semibold border",
                                                    leave.status === "รออนุมัติ" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                        leave.status === "อนุมัติ" ? "bg-green-50 text-green-700 border-green-200" :
                                                            "bg-red-50 text-red-700 border-red-200"
                                                )}>
                                                    {leave.status === "รออนุมัติ" ? "⏳ รอพิจารณา" : leave.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    {/* Approve/Reject buttons for pending requests */}
                                                    {leave.status === "รออนุมัติ" && leave.id && (
                                                        <>
                                                            <button
                                                                onClick={() => onStatusUpdate(leave.id!, "อนุมัติ")}
                                                                className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors border border-green-100"
                                                                title="อนุมัติ"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => onStatusUpdate(leave.id!, "ไม่อนุมัติ")}
                                                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-100"
                                                                title="ไม่อนุมัติ"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* Admin Actions */}
                                                    {isSuperAdmin && leave.id && (
                                                        <>
                                                            {onEdit && (
                                                                <button onClick={() => onEdit(leave)} className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors">
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            {onDelete && (
                                                                <button onClick={() => { if (confirm("ลบคำขอลา?")) onDelete(leave.id!) }} className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Image Preview Modal */}
            {viewingImage && (
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
                    onClick={() => setViewingImage(null)}
                >
                    <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                    <img
                        src={viewingImage}
                        alt="Evidence"
                        className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}
