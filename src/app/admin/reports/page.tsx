"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { attendanceService, leaveService, otService, employeeService, type Attendance, type LeaveRequest, type OTRequest, type Employee } from "@/lib/firestore";
import { getAttendanceByDateRangeWithoutPhoto, getLeaveByDateRangeWithoutAttachment } from "@/lib/firestoreRest";
import { useAdmin } from "@/components/auth/AuthProvider";
import { FileText, Clock, CalendarX, AlertTriangle } from "lucide-react";
import { format, startOfMonth, endOfMonth, differenceInMinutes, differenceInDays } from "date-fns";
import { th } from "date-fns/locale";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function ReportsPage() {
    const { user } = useAdmin();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"ot" | "late" | "leave">("ot");

    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
    });

    const [otData, setOtData] = useState<OTRequest[]>([]);
    const [lateData, setLateData] = useState<Attendance[]>([]);
    const [leaveData, setLeaveData] = useState<LeaveRequest[]>([]);
    const [allYearLeaves, setAllYearLeaves] = useState<LeaveRequest[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);

    // Debounce month selection to prevent rapid queries
    const debouncedMonth = useDebounce(selectedMonth, 500);

    // Cache for data
    const dataCache = useRef<{
        key: string;
        attendance: Attendance[];
        leaves: LeaveRequest[];
        yearLeaves: LeaveRequest[];
    } | null>(null);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user, debouncedMonth]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [year, month] = debouncedMonth.split("-").map(Number);
            const startDate = startOfMonth(new Date(year, month - 1));
            const endDate = endOfMonth(new Date(year, month - 1));

            // ดึงข้อมูลทั้งปีสำหรับนับครั้งที่ลา
            const yearStart = new Date(year, 0, 1);
            const yearEnd = new Date(year, 11, 31);

            const cacheKey = `${debouncedMonth}_${year}`;

            // ===== USE REST API WITH FIELD SELECTION =====
            // This excludes photo/attachment from network transfer!
            const [otRes, attendanceRes, leaveRes, yearLeaveRes, empRes] = await Promise.all([
                otService.getByDateRange(startDate, endDate),
                getAttendanceByDateRangeWithoutPhoto(startDate, endDate, 500),  // No photo!
                getLeaveByDateRangeWithoutAttachment(startDate, endDate, 200),  // No attachment!
                getLeaveByDateRangeWithoutAttachment(yearStart, yearEnd, 500),  // No attachment!
                employeeService.getAll(),
            ]);

            // Only approved OT
            setOtData(otRes.filter(o => o.status === "อนุมัติ"));

            // Only late check-ins
            setLateData((attendanceRes as Attendance[]).filter(a => a.status === "สาย"));

            // Only approved leaves
            setLeaveData((leaveRes as LeaveRequest[]).filter(l => l.status === "อนุมัติ"));
            setAllYearLeaves((yearLeaveRes as LeaveRequest[]).filter(l => l.status === "อนุมัติ"));

            setEmployees(empRes);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours} ชม. ${mins} นาที`;
        }
        return `${mins} นาที`;
    };

    // นับครั้งที่ลาของพนักงานทั้งปี (เรียงตามวันที่)
    const getLeaveCountOfYear = (employeeId: string, leaveType: string, currentLeaveDate: Date) => {
        const employeeLeaves = allYearLeaves
            .filter(l => l.employeeId === employeeId && l.leaveType === leaveType)
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

        const index = employeeLeaves.findIndex(l =>
            new Date(l.startDate).getTime() === new Date(currentLeaveDate).getTime()
        );

        return index + 1; // ครั้งที่ (1-based)
    };

    // นับจำนวนครั้งทั้งหมดของปี
    const getTotalLeaveCountOfYear = (employeeId: string, leaveType: string) => {
        return allYearLeaves.filter(l =>
            l.employeeId === employeeId && l.leaveType === leaveType
        ).length;
    };

    if (!user) {
        return <div className="p-8 text-center">กรุณาเข้าสู่ระบบ</div>;
    }

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const ITEMS_PER_PAGE = 25;

    // Get current data based on active tab with search filter
    const getCurrentData = () => {
        let data: any[] = [];
        switch (activeTab) {
            case "ot": data = otData; break;
            case "late": data = lateData; break;
            case "leave": data = leaveData; break;
        }

        if (searchTerm) {
            data = data.filter(item =>
                item.employeeName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return data;
    };

    const filteredData = getCurrentData();
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page when tab or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm]);

    return (
        <div className="flex-1 p-4 md:p-6 bg-gray-50 min-h-screen">
            {/* Compact Header */}
            <div className="mb-4">
                <h1 className="text-xl font-bold text-gray-900">รายงานละเอียด</h1>
                <p className="text-sm text-gray-500">สรุป OT, การมาสาย และการลา</p>
            </div>

            {/* Toolbar - Compact */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Month Selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 uppercase">เดือน</span>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div className="h-6 w-px bg-gray-200" />

                    {/* Tabs - Compact Pills */}
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab("ot")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === "ot"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            <Clock className="w-3 h-3 inline mr-1" />
                            OT ({otData.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("late")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === "late"
                                    ? "bg-amber-500 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            สาย ({lateData.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("leave")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === "leave"
                                    ? "bg-violet-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            <CalendarX className="w-3 h-3 inline mr-1" />
                            ลา ({leaveData.length})
                        </button>
                    </div>

                    <div className="flex-1" />

                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="ค้นหาพนักงาน..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md w-40 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <svg className="w-4 h-4 absolute left-2.5 top-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                    กำลังโหลด...
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {/* Table Container with Max Height */}
                    <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
                        {/* OT Report */}
                        {activeTab === "ot" && (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr className="border-b border-gray-200">
                                        <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">วันที่</th>
                                        <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">พนักงาน</th>
                                        <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">เวลา</th>
                                        <th className="px-3 py-2 text-center font-semibold text-gray-600 text-xs uppercase tracking-wide">ชั่วโมง</th>
                                        <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">เหตุผล</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(paginatedData as OTRequest[]).map((ot, idx) => {
                                        const duration = differenceInMinutes(new Date(ot.endTime), new Date(ot.startTime));
                                        const hours = (duration / 60).toFixed(1);
                                        return (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                                                    {format(new Date(ot.date), "d MMM", { locale: th })}
                                                </td>
                                                <td className="px-3 py-2 font-medium text-gray-900">{ot.employeeName}</td>
                                                <td className="px-3 py-2 text-gray-500 font-mono text-xs">
                                                    {format(new Date(ot.startTime), "HH:mm")}-{format(new Date(ot.endTime), "HH:mm")}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold">
                                                        {hours}h
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-gray-500 truncate max-w-[200px]" title={ot.reason}>
                                                    {ot.reason || "-"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {paginatedData.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                                                ไม่พบข้อมูล
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* Late Report */}
                        {activeTab === "late" && (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr className="border-b border-gray-200">
                                        <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">วันที่</th>
                                        <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">พนักงาน</th>
                                        <th className="px-3 py-2 text-center font-semibold text-gray-600 text-xs uppercase tracking-wide">เข้างาน</th>
                                        <th className="px-3 py-2 text-center font-semibold text-gray-600 text-xs uppercase tracking-wide">สาย</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(paginatedData as Attendance[]).map((att, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                                                {format(new Date(att.date), "d MMM", { locale: th })}
                                            </td>
                                            <td className="px-3 py-2 font-medium text-gray-900">{att.employeeName}</td>
                                            <td className="px-3 py-2 text-center font-mono text-xs text-gray-500">
                                                {att.checkIn ? format(new Date(att.checkIn), "HH:mm") : "-"}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-semibold">
                                                    {att.lateMinutes !== undefined ? `${att.lateMinutes}m` : "-"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedData.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                                                ไม่พบข้อมูล
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* Leave Report */}
                        {activeTab === "leave" && (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr className="border-b border-gray-200">
                                        <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">พนักงาน</th>
                                        <th className="px-3 py-2 text-center font-semibold text-gray-600 text-xs uppercase tracking-wide">ประเภท</th>
                                        <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">ช่วงวันที่</th>
                                        <th className="px-3 py-2 text-center font-semibold text-gray-600 text-xs uppercase tracking-wide">วัน</th>
                                        <th className="px-3 py-2 text-center font-semibold text-gray-600 text-xs uppercase tracking-wide">ครั้งที่</th>
                                        <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">เหตุผล</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(paginatedData as LeaveRequest[]).map((leave, idx) => {
                                        const days = differenceInDays(new Date(leave.endDate), new Date(leave.startDate)) + 1;
                                        const count = getLeaveCountOfYear(leave.employeeId, leave.leaveType, new Date(leave.startDate));
                                        const total = getTotalLeaveCountOfYear(leave.employeeId, leave.leaveType);
                                        const typeColor = leave.leaveType === "ลาป่วย"
                                            ? "bg-red-50 text-red-700"
                                            : leave.leaveType === "ลากิจ"
                                                ? "bg-blue-50 text-blue-700"
                                                : "bg-emerald-50 text-emerald-700";
                                        return (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-3 py-2 font-medium text-gray-900">{leave.employeeName}</td>
                                                <td className="px-3 py-2 text-center">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeColor}`}>
                                                        {leave.leaveType.replace("ลา", "")}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">
                                                    {format(new Date(leave.startDate), "d MMM", { locale: th })} - {format(new Date(leave.endDate), "d MMM", { locale: th })}
                                                </td>
                                                <td className="px-3 py-2 text-center text-gray-600 font-medium">{days}</td>
                                                <td className="px-3 py-2 text-center">
                                                    <span className="inline-block px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded text-xs font-medium">
                                                        {count}/{total}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-gray-500 truncate max-w-[150px]" title={leave.reason}>
                                                    {leave.reason || "-"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {paginatedData.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                                                ไม่พบข้อมูล
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination Footer */}
                    {totalPages > 1 && (
                        <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
                            <span className="text-gray-500">
                                แสดง {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} จาก {filteredData.length} รายการ
                            </span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ก่อนหน้า
                                </button>
                                <span className="px-3 py-1 bg-white border border-gray-300 rounded font-medium">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ถัดไป
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

