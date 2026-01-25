"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { auth } from "@/lib/firebase";
import { AttendanceTable } from "@/components/dashboard/AttendanceTable";
import { AttendanceFormModal } from "@/components/dashboard/AttendanceFormModal";
import { Button } from "@/components/ui/button";
import { CustomAlert } from "@/components/ui/custom-alert";
import { attendanceService, type Attendance, adminService, systemConfigService } from "@/lib/firestore";
import { Plus, Calendar as CalendarIcon, Search, Filter } from "lucide-react";

export default function DashboardPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [locationEnabled, setLocationEnabled] = useState(false);
    const [workTimeEnabled, setWorkTimeEnabled] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: "success" | "error" | "warning" | "info" }>({
        isOpen: false, title: "", message: "", type: "info"
    });

    const loadAttendances = async (date: Date) => {
        setLoading(true);
        try {
            const data = await attendanceService.getByDate(date);
            setAttendances(data);
        } catch (error) {
            console.error("Error loading attendances:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAttendances(selectedDate);
        const checkAdminRole = async () => {
            const user = auth.currentUser;
            if (user?.email) {
                const admin = await adminService.getByEmail(user.email);
                if (admin?.role === "super_admin" || admin?.role === "admin") setIsSuperAdmin(true);
            }
        };
        checkAdminRole();

        const loadConfig = async () => {
            try {
                const config = await systemConfigService.get();
                if (config?.locationConfig?.enabled) setLocationEnabled(true);
                setWorkTimeEnabled(config?.workTimeEnabled ?? true);
            } catch (error) {
                console.error("Error loading config:", error);
            }
        };
        loadConfig();
    }, [selectedDate]);



    const handleDeleteAttendance = async (id: string) => {
        try {
            await attendanceService.delete(id);
            loadAttendances(selectedDate);
        } catch (error) {
            console.error("Error deleting attendance:", error);
            setAlertState({ isOpen: true, title: "ผิดพลาด", message: "ลบข้อมูลไม่สำเร็จ", type: "error" });
        }
    };

    const stats = {
        checkedIn: new Set(attendances.filter(a => a.status === "เข้างาน" || a.status === "สาย").map(a => a.employeeId)).size,
        checkedOut: new Set(attendances.filter(a => a.status === "ออกงาน").map(a => a.employeeId)).size,
        late: new Set(attendances.filter(a => a.status === "สาย" || (a.lateMinutes && a.lateMinutes > 0)).map(a => a.employeeId)).size,
        beforeBreak: new Set(attendances.filter(a => a.status === "ก่อนพัก").map(a => a.employeeId)).size,
        afterBreak: new Set(attendances.filter(a => a.status === "หลังพัก").map(a => a.employeeId)).size,
        offsite: new Set(attendances.filter(a => a.status.includes("ออกนอกพื้นที่")).map(a => a.employeeId)).size,
        total: attendances.length,
    };

    const filteredAttendances = attendances.filter(a => {
        if (statusFilter) {
            if (statusFilter === "เข้างาน" && !(a.status === "เข้างาน" || a.status === "สาย")) return false;
            if (statusFilter === "ออกงาน" && a.status !== "ออกงาน") return false;
            if (statusFilter === "สาย" && a.status !== "สาย" && (!a.lateMinutes || a.lateMinutes <= 0)) return false;
            if (statusFilter === "ก่อนพัก" && a.status !== "ก่อนพัก") return false;
            if (statusFilter === "หลังพัก" && a.status !== "หลังพัก") return false;
            if (statusFilter === "นอกพื้นที่" && !a.status.includes("ออกนอกพื้นที่")) return false;
        }
        if (searchQuery) return a.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Dashboard และ บันทึกเวลา</h1>
                    <p className="text-sm text-gray-500 mt-1">ภาพรวมการลงเวลาพนักงานประจำวัน</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            type="date"
                            value={format(selectedDate, "yyyy-MM-dd")}
                            onChange={(e) => setSelectedDate(new Date(e.target.value))}
                            className="w-full sm:w-auto pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer font-medium text-gray-700"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Overview - Compact Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                    { label: "ทั้งหมด", value: stats.total, color: "gray", icon: Filter, active: statusFilter === null, onClick: () => setStatusFilter(null) },
                    { label: "เข้างาน", value: stats.checkedIn, color: "green", active: statusFilter === "เข้างาน", onClick: () => setStatusFilter(statusFilter === "เข้างาน" ? null : "เข้างาน") },
                    { label: "ออกงาน", value: stats.checkedOut, color: "blue", active: statusFilter === "ออกงาน", onClick: () => setStatusFilter(statusFilter === "ออกงาน" ? null : "ออกงาน") },
                    { label: "สาย", value: stats.late, color: "red", active: statusFilter === "สาย", onClick: () => setStatusFilter(statusFilter === "สาย" ? null : "สาย") },
                    { label: "ก่อนพัก", value: stats.beforeBreak, color: "yellow", active: statusFilter === "ก่อนพัก", onClick: () => setStatusFilter(statusFilter === "ก่อนพัก" ? null : "ก่อนพัก") },
                    { label: "หลังพัก", value: stats.afterBreak, color: "orange", active: statusFilter === "หลังพัก", onClick: () => setStatusFilter(statusFilter === "หลังพัก" ? null : "หลังพัก") },
                    { label: "นอกพื้นที่", value: stats.offsite, color: "purple", active: statusFilter === "นอกพื้นที่", onClick: () => setStatusFilter(statusFilter === "นอกพื้นที่" ? null : "นอกพื้นที่") },
                ].map((stat, idx) => (
                    <div
                        key={idx}
                        onClick={stat.onClick}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1
                            ${stat.active
                                ? `bg-${stat.color}-50 border-${stat.color}-200 ring-1 ring-${stat.color}-200`
                                : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
                            }`}
                    >
                        <span className={`text-[10px] uppercase tracking-wider font-semibold ${stat.active ? `text-${stat.color}-700` : "text-gray-500"}`}>
                            {stat.label}
                        </span>
                        <span className={`text-2xl font-bold ${stat.active ? `text-${stat.color}-700` : "text-gray-800"}`}>
                            {stat.value}
                        </span>
                    </div>
                ))}
            </div>

            {/* Toolbar & Filter */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อพนักงาน..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                        onClick={() => { setSelectedAttendance(null); setIsModalOpen(true); }}
                        className="w-full sm:w-auto bg-primary-dark hover:bg-primary-dark/90 text-white rounded-lg px-4 py-2 gap-2 h-10 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        ลงเวลาแทน
                    </Button>
                </div>
            </div>

            {/* Main Table */}
            {loading ? (
                <div className="bg-white rounded-xl p-12 text-center border border-gray-100 shadow-sm">
                    <div className="w-8 h-8 border-2 border-gray-100 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
                </div>
            ) : (
                <AttendanceTable
                    attendances={filteredAttendances}
                    onEdit={(a) => { setSelectedAttendance(a); setIsModalOpen(true); }}
                    onDelete={handleDeleteAttendance}
                    isSuperAdmin={isSuperAdmin}
                    locationEnabled={locationEnabled}
                    workTimeEnabled={workTimeEnabled}
                />
            )}

            {/* Modals */}
            <AttendanceFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                attendance={selectedAttendance}
                onSuccess={() => loadAttendances(selectedDate)}
            />
            <CustomAlert
                isOpen={alertState.isOpen}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
            />
        </div>
    );
}
