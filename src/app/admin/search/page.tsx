"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { employeeService, attendanceService, leaveService, otService, swapService, timeRequestService, systemConfigService, type Employee, type Attendance, type LeaveRequest, type OTRequest, type SwapRequest, type TimeRequest } from "@/lib/firestore";
import { getAttendanceByDateRangeWithoutPhoto } from "@/lib/firestoreRest";
import { AttendanceTable } from "@/components/dashboard/AttendanceTable";
import { LeaveTable } from "@/components/leave/LeaveTable";
import { OTTable } from "@/components/ot/OTTable";
import { Search, User, Download, Clock, Briefcase, FileText, ChevronRight, Phone, Mail, Calendar, MapPin, ArrowLeft, Filter, X, ArrowLeftRight, History } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { generateAttendancePDF } from "@/lib/pdfGenerator";
import { generateAttendanceCSV } from "@/lib/csvGenerator";
import { getLateMinutes, isLate, formatMinutesToHours } from "@/lib/workTime";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SearchPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [otRequests, setOTRequests] = useState<OTRequest[]>([]);
    const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
    const [timeRequests, setTimeRequests] = useState<TimeRequest[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [loading, setLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [activeTab, setActiveTab] = useState<"attendance" | "leave" | "ot" | "swap" | "time_correction">("attendance");
    const [locationEnabled, setLocationEnabled] = useState(false);
    const [workTimeEnabled, setWorkTimeEnabled] = useState(true);

    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

    useEffect(() => {
        loadEmployees();
        const loadConfig = async () => {
            try {
                const config = await systemConfigService.get();
                if (config?.locationConfig?.enabled) {
                    setLocationEnabled(true);
                }
                setWorkTimeEnabled(config?.workTimeEnabled ?? true);
            } catch (error) {
                console.error("Error loading config:", error);
            }
        };
        loadConfig();
    }, []);

    useEffect(() => {
        if (selectedEmployee?.id) {
            loadEmployeeData(selectedEmployee.id);
        }
    }, [selectedMonth]);

    useEffect(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) {
            setFilteredEmployees(employees); // Show all by default or empty? Let's show all for "Browse" feel
        } else {
            const filtered = employees.filter(emp =>
                emp.name.toLowerCase().includes(query) ||
                emp.email?.toLowerCase().includes(query) ||
                emp.employeeId?.toLowerCase().includes(query)
            );
            setFilteredEmployees(filtered);
        }
    }, [searchQuery, employees]);

    const loadEmployees = async () => {
        try {
            const data = await employeeService.getAll();
            setEmployees(data);
            setFilteredEmployees(data);
        } catch (error) {
            console.error("Error loading employees:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadEmployeeData = async (employeeId: string) => {
        setLoadingData(true);
        try {
            const [year, month] = selectedMonth.split('-').map(Number);
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            endDate.setHours(23, 59, 59, 999);

            const [allAttendance, leaveData, otData, swapData, timeData] = await Promise.all([
                getAttendanceByDateRangeWithoutPhoto(startDate, endDate, 1000),
                leaveService.getByEmployeeId(employeeId),
                otService.getByEmployeeId(employeeId),
                swapService.getByEmployeeId(employeeId),
                timeRequestService.getByEmployeeId(employeeId)
            ]);

            const attendanceData = (allAttendance as Attendance[]).filter(a => a.employeeId === employeeId);

            setAttendances(attendanceData);
            setLeaves(leaveData);
            setOTRequests(otData);
            setSwapRequests(swapData);
            setTimeRequests(timeData);
        } catch (error) {
            console.error("Error loading employee data:", error);
        } finally {
            setLoadingData(false);
        }
    };

    const handleSelectEmployee = (employee: Employee) => {
        setSelectedEmployee(employee);
        if (employee.id) {
            loadEmployeeData(employee.id);
        }
    };

    const handleBackToSearch = () => {
        setSelectedEmployee(null);
        setSearchQuery("");
    };

    const handleLeaveStatusUpdate = async (id: string, status: LeaveRequest["status"]) => {
        try {
            await leaveService.updateStatus(id, status);
            if (selectedEmployee?.id) loadEmployeeData(selectedEmployee.id);
        } catch (error) {
            console.error("Error updating leave status:", error);
        }
    };

    const handleOTStatusUpdate = async (id: string, status: OTRequest["status"]) => {
        try {
            await otService.updateStatus(id, status);
            if (selectedEmployee?.id) loadEmployeeData(selectedEmployee.id);
        } catch (error) {
            console.error("Error updating OT status:", error);
        }
    };

    const getLeaveUsed = () => {
        const used = { personal: 0, sick: 0, vacation: 0 };
        leaves.forEach(leave => {
            if (leave.status === "อนุมัติ") {
                const start = leave.startDate instanceof Date ? leave.startDate : new Date(leave.startDate);
                const end = leave.endDate instanceof Date ? leave.endDate : new Date(leave.endDate);
                const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

                if (leave.leaveType === "ลากิจ") used.personal += days;
                else if (leave.leaveType === "ลาป่วย") used.sick += days;
                else if (leave.leaveType === "ลาพักร้อน") used.vacation += days;
            }
        });
        return used;
    };

    // Helper to calculate summary stats
    const calculateSummary = () => {
        if (!selectedEmployee) return null;

        const [year, month] = selectedMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        const attendanceDays = attendances.filter(a => a.status === "เข้างาน" || a.status === "สาย" || a.status === "ออกงาน").length;

        let leaveDays = 0;
        leaves.forEach(l => {
            if (l.status === "อนุมัติ") {
                const start = new Date(l.startDate);
                const end = new Date(l.endDate);
                // Simple overlap logic: check if leave is in this month
                if ((start.getMonth() + 1 === month && start.getFullYear() === year) || (end.getMonth() + 1 === month && end.getFullYear() === year)) {
                    // Approximate days
                    leaveDays += Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                }
            }
        });

        const weeklyHolidays = selectedEmployee.weeklyHolidays || [0, 6];
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();
        let daysElapsed = daysInMonth;
        if (year === currentYear && month === currentMonth) daysElapsed = currentDay;
        else if (year > currentYear || (year === currentYear && month > currentMonth)) daysElapsed = 0;

        let expectedWorkDays = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month - 1, d);
            if (!weeklyHolidays.includes(date.getDay())) expectedWorkDays++;
        }

        let elapsedWorkDays = 0;
        for (let d = 1; d <= daysElapsed; d++) {
            const date = new Date(year, month - 1, d);
            if (!weeklyHolidays.includes(date.getDay())) elapsedWorkDays++;
        }
        const absentDays = Math.max(0, elapsedWorkDays - attendanceDays - leaveDays);
        const lateCount = attendances.filter(a => (a.lateMinutes || 0) > 0).length;
        const lateMinutes = attendances.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
        const totalOTHours = otRequests
            .filter(ot => {
                const otDate = new Date(ot.date);
                return ot.status === "อนุมัติ" && otDate.getMonth() === (month - 1) && otDate.getFullYear() === year;
            })
            .reduce((sum, ot) => {
                if (ot.startTime && ot.endTime) {
                    const start = ot.startTime instanceof Date ? ot.startTime : new Date(ot.startTime);
                    const end = ot.endTime instanceof Date ? ot.endTime : new Date(ot.endTime);
                    return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                }
                return sum;
            }, 0);

        return { totalDays: daysInMonth, attendanceDays, leaveDays, absentDays, lateCount, lateMinutes, totalOTHours, expectedWorkDays };
    };

    const summary = calculateSummary();


    return (
        <div className="flex-1 p-6 max-w-7xl mx-auto space-y-6">
            {!selectedEmployee ? (
                // Search View
                <>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">ฐานข้อมูลพนักงาน</h1>
                            <p className="text-sm text-gray-500 mt-1">ค้นหาและจัดการข้อมูลพนักงานรายบุคคล</p>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="ค้นหาชื่อ, แผนก..."
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                                        <th className="px-6 py-3 font-semibold">พนักงาน</th>
                                        <th className="px-6 py-3 font-semibold">แผนก/ตำแหน่ง</th>
                                        <th className="px-6 py-3 font-semibold">ติดต่อ</th>
                                        <th className="px-6 py-3 font-semibold text-right">ดำเนินการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredEmployees.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                ไม่พบข้อมูลพนักงาน
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredEmployees.map((emp) => (
                                            <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm border border-blue-200">
                                                            {emp.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 text-sm">{emp.name}</div>
                                                            <div className="text-[10px] text-gray-500">{emp.employeeId || "-"}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-gray-900">{emp.position}</span>
                                                        <span className="text-xs text-gray-500">{emp.department || "-"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        {emp.phone && (
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                                <Phone className="w-3 h-3 text-gray-400" /> {emp.phone}
                                                            </div>
                                                        )}
                                                        {emp.email && (
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                                <Mail className="w-3 h-3 text-gray-400" /> {emp.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleSelectEmployee(emp)}
                                                        className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    >
                                                        ดูข้อมูล <ChevronRight className="w-4 h-4 ml-1" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                // Detail View
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBackToSearch}
                            className="bg-white hover:bg-gray-50 text-gray-600 border-gray-200 h-9 gap-2 shadow-sm"
                        >
                            <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
                        </Button>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <User className="w-5 h-5 text-gray-400" /> ข้อมูลพนักงาน
                        </h2>
                    </div>

                    {/* Employee Profile Header */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary-dark to-primary-light flex items-center justify-center text-white font-bold text-3xl shadow-sm shrink-0">
                                {selectedEmployee.name.charAt(0)}
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="col-span-1 md:col-span-2 space-y-1">
                                    <h1 className="text-2xl font-bold text-gray-900">{selectedEmployee.name}</h1>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium">{selectedEmployee.employeeId}</span>
                                        <span>•</span>
                                        <span className="text-primary-dark font-medium">{selectedEmployee.position}</span>
                                        {selectedEmployee.department && (
                                            <>
                                                <span>•</span>
                                                <span>{selectedEmployee.department}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Mail className="w-4 h-4 text-gray-400" /> {selectedEmployee.email}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone className="w-4 h-4 text-gray-400" /> {selectedEmployee.phone || "-"}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Calendar className="w-4 h-4 text-gray-400" /> เริ่มงาน: {selectedEmployee.registeredDate ? format(new Date(selectedEmployee.registeredDate), "d MMM yyyy", { locale: th }) : "-"}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Briefcase className="w-4 h-4 text-gray-400" /> ประเภท: {selectedEmployee.type}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dashboard Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Stats Sidebar */}
                        <div className="space-y-6">
                            {/* Quota Stats */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
                                <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">วันลาคงเหลือ</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { label: "ลาพักร้อน", key: "vacation" as const, color: "blue" },
                                        { label: "ลากิจ", key: "personal" as const, color: "orange" },
                                        { label: "ลาป่วย", key: "sick" as const, color: "red" },
                                    ].map((type) => {
                                        const total = selectedEmployee.leaveQuota?.[type.key] || 0;
                                        const used = getLeaveUsed()[type.key];
                                        const remaining = Math.max(0, total - used);
                                        const percent = total > 0 ? (remaining / total) * 100 : 0;

                                        return (
                                            <div key={type.key} className="space-y-1">
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-gray-600">{type.label}</span>
                                                    <span className="text-gray-900">{remaining}/{total}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div className={`h-full bg-${type.color}-500 rounded-full`} style={{ width: `${percent}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Monthly Summary */}
                            {summary && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wider">สรุปเดือนนี้</h3>
                                        <input
                                            type="month"
                                            value={selectedMonth}
                                            onChange={(e) => setSelectedMonth(e.target.value)}
                                            className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-100">
                                            <div className="text-xl font-bold text-gray-900">{summary.attendanceDays}</div>
                                            <div className="text-[10px] text-gray-500">วันทำงาน</div>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-100">
                                            <div className="text-xl font-bold text-red-600">{summary.lateCount}</div>
                                            <div className="text-[10px] text-gray-500">สาย (ครั้ง)</div>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-100">
                                            <div className="text-xl font-bold text-blue-600">{formatMinutesToHours(summary.totalOTHours)}</div>
                                            <div className="text-[10px] text-gray-500">OT (ชม.)</div>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-100">
                                            <div className="text-xl font-bold text-orange-600">{summary.absentDays}</div>
                                            <div className="text-[10px] text-gray-500">ขาดงาน</div>
                                        </div>
                                    </div>
                                    <div className="pt-2 flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => generateAttendancePDF(selectedEmployee.name, attendances, otRequests, summary, leaves, swapRequests)} className="flex-1 text-xs h-8">
                                            <Download className="w-3 h-3 mr-1" /> PDF
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => generateAttendanceCSV(selectedEmployee.name, attendances, otRequests, summary, leaves, swapRequests)} className="flex-1 text-xs h-8">
                                            <FileText className="w-3 h-3 mr-1" /> CSV
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Main Content Tabs */}
                        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-[500px]">
                            {/* Tab Headers */}
                            <div className="flex border-b border-gray-100 overflow-x-auto">
                                {[
                                    { id: "attendance", label: "เวลาเข้า-ออก", icon: Clock },
                                    { id: "leave", label: "ประวัติการลา", icon: Briefcase },
                                    { id: "ot", label: "ล่วงเวลา (OT)", icon: FileText },
                                    { id: "swap", label: "สลับวันหยุด", icon: ArrowLeftRight },
                                    { id: "time_correction", label: "ปรับเวลา/ยืนยัน", icon: History },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={cn(
                                            "flex-1 py-4 px-4 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                                            activeTab === tab.id
                                                ? "border-primary-dark text-primary-dark bg-primary-dark/5"
                                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                        )}
                                    >
                                        <tab.icon className="w-4 h-4" /> <span className="hidden sm:inline">{tab.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="p-6 flex-1">
                                {loadingData ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                        <div className="w-8 h-8 border-2 border-gray-200 border-t-primary-dark rounded-full animate-spin mb-3"></div>
                                        <p className="text-sm">กำลังโหลดข้อมูล...</p>
                                    </div>
                                ) : (
                                    <>
                                        {activeTab === "attendance" && (
                                            <AttendanceTable attendances={attendances} locationEnabled={locationEnabled} workTimeEnabled={workTimeEnabled} />
                                        )}
                                        {activeTab === "leave" && (
                                            <LeaveTable leaves={leaves} onStatusUpdate={handleLeaveStatusUpdate} />
                                        )}
                                        {activeTab === "ot" && (
                                            <OTTable otRequests={otRequests} onStatusUpdate={handleOTStatusUpdate} />
                                        )}
                                        {activeTab === "swap" && (
                                            <div>
                                                {swapRequests.length === 0 ? (
                                                    <div className="text-center py-12 text-gray-400">ไม่มีข้อมูลการสลับวันหยุด</div>
                                                ) : (
                                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                        <table className="w-full text-sm text-left">
                                                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                                                <tr>
                                                                    <th className="px-4 py-3">วันที่ยื่น</th>
                                                                    <th className="px-4 py-3">วันหยุดเดิม (มาทำ)</th>
                                                                    <th className="px-4 py-3">วันหยุดใหม่ (ขอหยุด)</th>
                                                                    <th className="px-4 py-3">เหตุผล</th>
                                                                    <th className="px-4 py-3 text-right">สถานะ</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                                {swapRequests.map((req) => (
                                                                    <tr key={req.id}>
                                                                        <td className="px-4 py-3 text-gray-500">{req.createdAt ? format(req.createdAt instanceof Date ? req.createdAt : (req.createdAt as any).toDate(), "d MMM yy", { locale: th }) : "-"}</td>
                                                                        <td className="px-4 py-3 text-green-600 font-medium">{format(req.workDate instanceof Date ? req.workDate : (req.workDate as any).toDate(), "d MMM yyyy", { locale: th })}</td>
                                                                        <td className="px-4 py-3 text-red-600 font-medium">{format(req.holidayDate instanceof Date ? req.holidayDate : (req.holidayDate as any).toDate(), "d MMM yyyy", { locale: th })}</td>
                                                                        <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">{req.reason}</td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${req.status === "อนุมัติ" ? "bg-green-50 text-green-700 border-green-200" : req.status === "ไม่อนุมัติ" ? "bg-red-50 text-red-700 border-red-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}`}>
                                                                                {req.status}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {activeTab === "time_correction" && (
                                            <div>
                                                {timeRequests.length === 0 ? (
                                                    <div className="text-center py-12 text-gray-400">ไม่มีข้อมูลการขอปรับเวลา</div>
                                                ) : (
                                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                        <table className="w-full text-sm text-left">
                                                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                                                <tr>
                                                                    <th className="px-4 py-3">วันที่ยื่น</th>
                                                                    <th className="px-4 py-3">ประเภท</th>
                                                                    <th className="px-4 py-3">เวลาที่ขอปรับ</th>
                                                                    <th className="px-4 py-3">เหตุผล</th>
                                                                    <th className="px-4 py-3">หลักฐาน</th>
                                                                    <th className="px-4 py-3 text-right">สถานะ</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                                {timeRequests.map((req) => (
                                                                    <tr key={req.id}>
                                                                        <td className="px-4 py-3 text-gray-500">
                                                                            {req.createdAt ? format(req.createdAt instanceof Date ? req.createdAt : (req.createdAt as any).toDate(), "d MMM yy", { locale: th }) : "-"}
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            <span className={`px-2 py-1 rounded text-[10px] font-medium ${req.type === 'เข้างาน' ? 'bg-green-50 text-green-700' :
                                                                                req.type === 'ออกงาน' ? 'bg-red-50 text-red-700' :
                                                                                    'bg-orange-50 text-orange-700'
                                                                                }`}>
                                                                                {req.type}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-gray-900 font-medium">
                                                                            {format(req.date instanceof Date ? req.date : (req.date as any).toDate(), "d MMM yy", { locale: th })} {format(req.time instanceof Date ? req.time : (req.time as any).toDate(), "HH:mm")}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">{req.reason}</td>
                                                                        <td className="px-4 py-3">
                                                                            {req.attachment ? (
                                                                                <a href={req.attachment} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">ดูรูป</a>
                                                                            ) : <span className="text-gray-400">-</span>}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${req.status === "อนุมัติ" ? "bg-green-50 text-green-700 border-green-200" : req.status === "ไม่อนุมัติ" ? "bg-red-50 text-red-700 border-red-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}`}>
                                                                                {req.status}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
