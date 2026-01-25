import { cn } from "@/lib/utils";
import { type OTRequest } from "@/lib/firestore";
import { Check, X, Edit2, Trash2, User, Clock, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[240px]">พนักงาน</th>
                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">วันและเวลาทำงาน</th>
                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-[100px]">จำนวน ชม.</th>
                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[200px]">เหตุผล</th>
                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-[120px]">สถานะ</th>
                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-[120px]">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {otRequests.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-16 text-center text-gray-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                                            <Clock className="w-6 h-6 text-gray-300" />
                                        </div>
                                        <p className="text-sm">ไม่มีข้อมูลคำขอร่วงเวลา</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            otRequests.map((ot) => (
                                <tr key={ot.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs border border-indigo-200">
                                                {ot.employeeName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 leading-none mb-1">{ot.employeeName}</div>
                                                <div className="text-[10px] text-gray-400">{ot.employeeId || "-"}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                {ot.date ? format(new Date(ot.date), "d MMM yy", { locale: th }) : "-"}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 pl-5">
                                                <Clock className="w-3 h-3 text-gray-400" />
                                                {ot.startTime ? format(new Date(ot.startTime), "HH:mm") : "-"} - {ot.endTime ? format(new Date(ot.endTime), "HH:mm") : "-"}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <div className="inline-flex items-center justify-center px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-xs font-semibold text-gray-700 w-16">
                                            {ot.startTime && ot.endTime ? calculateHours(new Date(ot.startTime), new Date(ot.endTime)) : "-"} ชม.
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        {ot.reason ? (
                                            <div className="text-xs text-gray-600 line-clamp-1" title={ot.reason}>
                                                <span className="text-gray-400 mr-1.5 align-middle"><FileText className="inline w-3 h-3" /></span>
                                                {ot.reason}
                                            </div>
                                        ) : <span className="text-xs text-gray-400">-</span>}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={cn(
                                            "inline-flex items-center justify-center min-w-[80px] px-2.5 py-1 rounded-full text-[10px] font-semibold border",
                                            ot.status === "รออนุมัติ" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                                ot.status === "อนุมัติ" ? "bg-green-50 text-green-700 border-green-200" :
                                                    "bg-red-50 text-red-700 border-red-200"
                                        )}>
                                            {ot.status === "รออนุมัติ" ? "⏳ รอพิจารณา" : ot.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            {/* Approve/Reject buttons for pending requests */}
                                            {ot.status === "รออนุมัติ" && ot.id && (
                                                <>
                                                    <button
                                                        onClick={() => onStatusUpdate(ot.id!, "อนุมัติ")}
                                                        className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors border border-green-100"
                                                        title="อนุมัติ"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onStatusUpdate(ot.id!, "ไม่อนุมัติ")}
                                                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-100"
                                                        title="ไม่อนุมัติ"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}

                                            {/* Admin Actions */}
                                            {isSuperAdmin && ot.id && (
                                                <>
                                                    {onEdit && (
                                                        <button
                                                            onClick={() => onEdit(ot)}
                                                            className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                                                            title="แก้ไข"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {onDelete && (
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`ลบคำขอ OT?`)) {
                                                                    onDelete(ot.id!);
                                                                }
                                                            }}
                                                            className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                                                            title="ลบ"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
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
