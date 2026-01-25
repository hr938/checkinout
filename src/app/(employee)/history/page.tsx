"use client";

import { useEffect, useState } from "react";
import { attendanceService, leaveService, otService, swapService, timeRequestService } from "@/lib/firestore";
import { getAttendanceByEmployeeIdWithoutPhoto } from "@/lib/firestoreRest";
import { Attendance, LeaveRequest, OTRequest, SwapRequest, TimeRequest } from "@/lib/firestore";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { EmployeeHeader } from "@/components/mobile/EmployeeHeader";
import { useEmployee } from "@/contexts/EmployeeContext";
import { Calendar, Clock, MapPin, FileText, UserX, Filter, CheckCircle, XCircle, AlertCircle, ArrowLeftRight, History } from "lucide-react";

// Unified Type
type HistoryItem = {
    id: string;
    type: "attendance" | "leave" | "ot" | "swap" | "time_correction";
    date: Date;
    title: string;
    subtitle?: string;
    status?: string; // "เข้างาน" | "ออกงาน" | "อนุมัติ" ...
    details?: string;
    sortTime: number; // timestamp for sorting
    originalData: any;
};

export default function HistoryPage() {
    const { employee, loading: employeeLoading } = useEmployee();
    const [filter, setFilter] = useState<"all" | "work" | "request">("all");
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!employee?.id) return;
            setLoading(true);
            try {
                // Fetch Data concurrently
                // Fetch Data concurrently
                // Attendance: Fetch last 100 records
                // Requests: Fetch last 60 records each to prevent performance issues
                const LIMIT_REQ = 60;
                const [atts, leaves, ots, swaps, times] = await Promise.all([
                    getAttendanceByEmployeeIdWithoutPhoto(employee.id, 100),
                    leaveService.getByEmployeeId(employee.id, undefined, LIMIT_REQ),
                    otService.getByEmployeeId(employee.id, LIMIT_REQ),
                    swapService.getByEmployeeId(employee.id, LIMIT_REQ),
                    timeRequestService.getByEmployeeId(employee.id, LIMIT_REQ)
                ]);

                const historyItems: HistoryItem[] = [];

                // 1. Process Attendance
                (atts as Attendance[]).forEach(a => {
                    historyItems.push({
                        id: a.id || Math.random().toString(),
                        type: "attendance",
                        date: a.date instanceof Date ? a.date : (a.date as any).toDate(),
                        title: a.status, // "เข้างาน" / "ออกงาน"
                        subtitle: format(a.date instanceof Date ? a.date : (a.date as any).toDate(), "HH:mm น."),
                        status: a.status, // Used for color logic
                        details: a.location,
                        sortTime: (a.date instanceof Date ? a.date : (a.date as any).toDate()).getTime(),
                        originalData: a
                    });
                });

                // 2. Process Leave
                leaves.forEach(l => {
                    const d = l.createdAt instanceof Date ? l.createdAt : (l.createdAt as any).toDate();
                    historyItems.push({
                        id: l.id || Math.random().toString(),
                        type: "leave",
                        date: d,
                        title: `ลา: ${l.leaveType}`,
                        subtitle: `${format(l.startDate instanceof Date ? l.startDate : (l.startDate as any).toDate(), "d MMM", { locale: th })} - ${format(l.endDate instanceof Date ? l.endDate : (l.endDate as any).toDate(), "d MMM", { locale: th })}`,
                        status: l.status,
                        details: l.reason,
                        sortTime: d.getTime(),
                        originalData: l
                    });
                });

                // 3. Process OT
                ots.forEach(o => {
                    const d = o.createdAt instanceof Date ? o.createdAt : (o.createdAt as any).toDate();
                    historyItems.push({
                        id: o.id || Math.random().toString(),
                        type: "ot",
                        date: d,
                        title: "ขอ OT",
                        subtitle: `${format(o.startTime instanceof Date ? o.startTime : (o.startTime as any).toDate(), "HH:mm")} - ${format(o.endTime instanceof Date ? o.endTime : (o.endTime as any).toDate(), "HH:mm")}`,
                        status: o.status,
                        details: o.reason,
                        sortTime: d.getTime(),
                        originalData: o
                    });
                });

                // 4. Process Swap
                swaps.forEach(s => {
                    const d = s.createdAt instanceof Date ? s.createdAt : (s.createdAt as any).toDate();
                    historyItems.push({
                        id: s.id || Math.random().toString(),
                        type: "swap",
                        date: d,
                        title: "ขอสลับวัน",
                        subtitle: `หยุด: ${format(s.holidayDate instanceof Date ? s.holidayDate : (s.holidayDate as any).toDate(), "d MMM", { locale: th })}`,
                        status: s.status,
                        details: s.reason,
                        sortTime: d.getTime(),
                        originalData: s
                    });
                });

                // 5. Process Time Correction
                times.forEach(t => {
                    const d = t.createdAt instanceof Date ? t.createdAt : (t.createdAt as any).toDate();
                    historyItems.push({
                        id: t.id || Math.random().toString(),
                        type: "time_correction",
                        date: d,
                        title: `แก้เวลา: ${t.type}`,
                        subtitle: `${format(t.date instanceof Date ? t.date : (t.date as any).toDate(), "d MMM", { locale: th })} เวลา ${format(t.time instanceof Date ? t.time : (t.time as any).toDate(), "HH:mm")}`,
                        status: t.status,
                        details: t.reason,
                        sortTime: d.getTime(),
                        originalData: t
                    });
                });

                // Sort descending
                historyItems.sort((a, b) => b.sortTime - a.sortTime);

                setItems(historyItems);

            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setLoading(false);
            }
        };

        if (employee) fetchData();
        else if (!employeeLoading) setLoading(false);
    }, [employee, employeeLoading]);

    // Filtering
    const filteredItems = items.filter(item => {
        if (filter === "all") return true;
        if (filter === "work") return item.type === "attendance";
        if (filter === "request") return item.type !== "attendance";
        return true;
    });

    // Grouping by Date
    const groupedItems: { [key: string]: HistoryItem[] } = {};
    filteredItems.forEach(item => {
        const dateKey = format(item.date, "d MMMM yyyy", { locale: th });
        if (!groupedItems[dateKey]) groupedItems[dateKey] = [];
        groupedItems[dateKey].push(item);
    });

    const getIcon = (item: HistoryItem) => {
        switch (item.type) {
            case "attendance": return <Clock className="w-5 h-5 text-green-600" />;
            case "leave": return <FileText className="w-5 h-5 text-blue-600" />;
            case "ot": return <Clock className="w-5 h-5 text-purple-600" />;
            case "swap": return <ArrowLeftRight className="w-5 h-5 text-teal-600" />;
            case "time_correction": return <History className="w-5 h-5 text-orange-600" />;
        }
    };

    const getStatusBadge = (status?: string) => {
        if (!status) return null;
        if (["เข้างาน", "ออกงาน"].includes(status)) {
            return (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${status === 'เข้างาน' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {status}
                </span>
            );
        }

        let colorClass = "bg-gray-100 text-gray-600";
        let icon = null;

        if (status === "อนุมัติ") { colorClass = "bg-green-50 text-green-600"; icon = <CheckCircle className="w-3 h-3" />; }
        else if (status === "ไม่อนุมัติ") { colorClass = "bg-red-50 text-red-600"; icon = <XCircle className="w-3 h-3" />; }
        else if (status === "รออนุมัติ") { colorClass = "bg-yellow-50 text-yellow-600"; icon = <Clock className="w-3 h-3" />; }

        return (
            <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${colorClass}`}>
                {icon} {status}
            </span>
        );
    };

    if (!employee && !employeeLoading) {
        return (
            <div className="min-h-screen bg-gray-50 pb-20">
                <EmployeeHeader />
                <div className="p-8 text-center text-gray-500">ไม่พบข้อมูลพนักงาน</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <EmployeeHeader />

            <div className="px-4 -mt-6 relative z-10">
                {/* Filter Chips */}
                <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-xl border border-gray-200 shadow-sm flex gap-2 overflow-x-auto no-scrollbar mb-4">
                    <button
                        onClick={() => setFilter("all")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        ทั้งหมด
                    </button>
                    <button
                        onClick={() => setFilter("work")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${filter === 'work' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                    >
                        <Clock className="w-3 h-3" />
                        เข้า/ออกงาน
                    </button>
                    <button
                        onClick={() => setFilter("request")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${filter === 'request' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                    >
                        <FileText className="w-3 h-3" />
                        คำร้อง
                    </button>
                </div>
            </div>

            <main className="px-4 pb-8 space-y-6">
                {loading ? (
                    <div className="text-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                        <p className="text-xs text-gray-500 mt-2">กำลังโหลดประวัติ...</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                        <History className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">ไม่พบประวัติการทำรายการ</p>
                    </div>
                ) : (
                    Object.entries(groupedItems).map(([date, groupItems]) => (
                        <div key={date} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h3 className="text-xs font-bold text-gray-500 mb-2 ml-2">{date}</h3>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
                                {groupItems.map((item) => (
                                    <div key={item.id} className="p-3.5 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                                        {/* Time Column */}
                                        <div className="flex flex-col items-center min-w-[50px] pt-1">
                                            <span className="text-sm font-bold text-gray-900">
                                                {format(item.date, "HH:mm")}
                                            </span>
                                            {/* Vertical Line Connector (Visual only) */}
                                            {/* <div className="h-full w-px bg-gray-100 mt-1"></div> */}
                                        </div>

                                        {/* Icon */}
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-gray-50 ${item.type === 'attendance' ? 'bg-green-50' :
                                            item.type === 'leave' ? 'bg-blue-50' :
                                                item.type === 'ot' ? 'bg-purple-50' :
                                                    item.type === 'time_correction' ? 'bg-orange-50' : 'bg-gray-50'
                                            }`}>
                                            {getIcon(item)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-gray-800 text-sm">{item.title}</h4>
                                                {getStatusBadge(item.status)}
                                            </div>

                                            {item.subtitle && (
                                                <p className="text-xs text-gray-500 mt-0.5 font-medium">{item.subtitle}</p>
                                            )}

                                            {item.details && (
                                                <p className="text-[11px] text-gray-400 mt-1 line-clamp-1 bg-gray-50 inline-block px-1.5 py-0.5 rounded">
                                                    {item.details}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}
