import { cn } from "@/lib/utils";
import { type Attendance } from "@/lib/firestore";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { formatMinutesToHours } from "@/lib/workTime";
import { MapPin, X, Edit2, Trash2, Clock, Calendar, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface AttendanceTableProps {
    attendances: Attendance[];
    onEdit?: (attendance: Attendance) => void;
    onDelete?: (id: string) => void;
    isSuperAdmin?: boolean;
    locationEnabled?: boolean;
    workTimeEnabled?: boolean;
}

export function AttendanceTable({ attendances, onEdit, onDelete, isSuperAdmin = false, locationEnabled = false, workTimeEnabled = true }: AttendanceTableProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const openMap = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="py-3 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider w-[240px]">พนักงาน</th>
                                <th className="py-3 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">สถานะ</th>
                                <th className="py-3 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">เวลา</th>
                                <th className="py-3 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">ที่อยู่ / พิกัด</th>
                                <th className="py-3 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">หมายเหตุ</th>
                                {isSuperAdmin && (
                                    <th className="py-3 px-4 text-sm font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {attendances.length === 0 ? (
                                <tr>
                                    <td colSpan={isSuperAdmin ? 6 : 5} className="py-16 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                                                <Calendar className="w-6 h-6 text-gray-300" />
                                            </div>
                                            <p className="text-sm">ไม่มีข้อมูลการลงเวลาในวันนี้</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                attendances.map((attendance, index) => (
                                    <tr key={attendance.id || index} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                {attendance.photo ? (
                                                    <button
                                                        onClick={() => setSelectedImage(attendance.photo!)}
                                                        className="w-9 h-9 rounded-full overflow-hidden border border-gray-200 ring-2 ring-transparent group-hover:ring-gray-100 transition-all cursor-zoom-in"
                                                    >
                                                        <img
                                                            src={attendance.photo}
                                                            alt={attendance.employeeName}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </button>
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs border border-gray-200">
                                                        {attendance.employeeName.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 leading-none mb-1">{attendance.employeeName}</div>
                                                    <div className="text-[11px] text-gray-400 flex items-center gap-1">
                                                        {attendance.date ? format(attendance.date, "d MMM yyyy", { locale: th }) : "-"}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border shadow-sm",
                                                attendance.status === "เข้างาน" ? "bg-green-50 text-green-700 border-green-200" :
                                                    attendance.status === "ออกงาน" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                        attendance.status === "สาย" ? "bg-red-50 text-red-700 border-red-200" :
                                                            attendance.status === "ลางาน" ? "bg-gray-50 text-gray-700 border-gray-200" :
                                                                "bg-orange-50 text-orange-700 border-orange-200"
                                            )}>
                                                {attendance.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600 font-mono">
                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                {attendance.checkIn ? format(attendance.checkIn, "HH:mm") :
                                                    attendance.checkOut ? format(attendance.checkOut, "HH:mm") : "-"}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col gap-1 max-w-[200px]">
                                                {attendance.location && (
                                                    <span className="text-xs text-gray-600 truncate" title={attendance.location}>
                                                        {attendance.location}
                                                    </span>
                                                )}
                                                {attendance.latitude && attendance.longitude ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => openMap(attendance.latitude!, attendance.longitude!)}
                                                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                                                        >
                                                            <MapPin className="w-3 h-3" /> พิกัด
                                                        </button>
                                                        {locationEnabled && attendance.distance !== undefined && (
                                                            <span className={`text-[10px] font-medium ${attendance.distance > 500 ? 'text-red-500' : 'text-green-600'}`}>
                                                                {attendance.distance < 1000 ? `${Math.round(attendance.distance)} ม.` : `${(attendance.distance / 1000).toFixed(1)} กม.`}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : <span className="text-xs text-gray-400">-</span>}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                {workTimeEnabled && attendance.lateMinutes && attendance.lateMinutes > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-600 text-xs font-medium border border-red-100">
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        สาย {formatMinutesToHours(attendance.lateMinutes)}
                                                    </span>
                                                ) : null}
                                                {attendance.locationNote && (
                                                    <span className="inline-block px-2 py-1 rounded bg-yellow-50 text-yellow-700 text-xs font-medium border border-yellow-100 max-w-[200px] break-words line-clamp-2" title={attendance.locationNote}>
                                                        Note: {attendance.locationNote}
                                                    </span>
                                                )}
                                                {!((workTimeEnabled && attendance.lateMinutes && attendance.lateMinutes > 0) || attendance.locationNote) && (
                                                    <span className="text-xs text-gray-300">-</span>
                                                )}
                                            </div>
                                        </td>
                                        {isSuperAdmin && (
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    {onEdit && (
                                                        <button onClick={() => onEdit(attendance)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {onDelete && (
                                                        <button onClick={() => { if (confirm("ยืนยันการลบ?")) onDelete(attendance.id!); }} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200" onClick={() => setSelectedImage(null)}>
                    <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                    <img src={selectedImage} alt="Preview" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </>
    );
}
