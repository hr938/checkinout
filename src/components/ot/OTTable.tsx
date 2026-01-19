import { cn } from "@/lib/utils";
import { type OTRequest } from "@/lib/firestore";
import { Check, X, Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface OTTableProps {
    otRequests: OTRequest[];
    onStatusUpdate: (id: string, status: OTRequest["status"]) => void;
    onEdit?: (ot: OTRequest) => void;
    onDelete?: (id: string) => void;
    isSuperAdmin?: boolean;
}

export function OTTable({ otRequests, onStatusUpdate, onEdit, onDelete, isSuperAdmin = false }: OTTableProps) {
    const calculateHours = (startTime: Date, endTime: Date) => {
        const diff = endTime.getTime() - startTime.getTime();
        return (diff / (1000 * 60 * 60)).toFixed(1);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-left">
                            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[25%]">ชื่อ-นามสกุล</th>
                            <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[15%]">วันที่</th>
                            <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-[15%]">เวลา</th>
                            <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-[10%]">ชม.รวม</th>
                            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[25%]">เหตุผล</th>
                            <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-[10%]">สถานะ</th>
                            <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-[10%]">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {otRequests.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-12 text-center text-gray-500">
                                    ไม่มีข้อมูลการขอ OT
                                </td>
                            </tr>
                        ) : (
                            otRequests.map((ot) => (
                                <tr key={ot.id} className="hover:bg-gray-50/40 transition-colors group">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm border border-indigo-100">
                                                {ot.employeeName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900">{ot.employeeName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-700">
                                                {ot.date ? format(ot.date, "dd MMM yy") : "-"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-gray-50 border border-gray-100 text-xs font-medium text-gray-600">
                                            {ot.startTime ? format(ot.startTime, "HH:mm") : "-"} - {ot.endTime ? format(ot.endTime, "HH:mm") : "-"}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <span className="text-sm font-bold text-gray-700">
                                            {ot.startTime && ot.endTime ? calculateHours(ot.startTime, ot.endTime) : "-"}
                                        </span>
                                        <span className="text-[10px] text-gray-400 ml-1">ชม.</span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="max-w-[200px] relative group/tooltip">
                                            <p className="text-sm text-gray-600 truncate cursor-help">
                                                {ot.reason || "-"}
                                            </p>
                                            {ot.reason && ot.reason.length > 30 && (
                                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block z-20 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg pointer-events-none">
                                                    {ot.reason}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <span className={cn(
                                            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                                            ot.status === "รออนุมัติ" ? "bg-orange-100 text-orange-700" :
                                                ot.status === "อนุมัติ" ? "bg-green-100 text-green-700" :
                                                    "bg-red-100 text-red-700"
                                        )}>
                                            {ot.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {/* Approve/Reject buttons for pending requests */}
                                            {ot.status === "รออนุมัติ" && ot.id && (
                                                <>
                                                    <button
                                                        onClick={() => onStatusUpdate(ot.id!, "อนุมัติ")}
                                                        className="p-1.5 hover:bg-green-50 text-gray-400 hover:text-green-600 rounded-lg transition-colors border border-transparent hover:border-green-200"
                                                        title="อนุมัติ"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => onStatusUpdate(ot.id!, "ไม่อนุมัติ")}
                                                        className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                                        title="ไม่อนุมัติ"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}

                                            {/* Edit and Delete buttons for super_admin */}
                                            {isSuperAdmin && ot.id && (
                                                <>
                                                    {onEdit && (
                                                        <button
                                                            onClick={() => onEdit(ot)}
                                                            className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                                                            title="แก้ไข"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {onDelete && (
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`คุณต้องการลบคำขอ OT ของ ${ot.employeeName} ใช่หรือไม่?`)) {
                                                                    onDelete(ot.id!);
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
    );
}
