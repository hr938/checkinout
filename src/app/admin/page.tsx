"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { AttendanceTable } from "@/components/dashboard/AttendanceTable";
import { AttendanceFormModal } from "@/components/dashboard/AttendanceFormModal";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { attendanceService, type Attendance, adminService, systemConfigService } from "@/lib/firestore";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { auth } from "@/lib/firebase";
import { CustomAlert } from "@/components/ui/custom-alert";

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
    const [alertState, setAlertState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: "success" | "error" | "warning" | "info";
    }>({
        isOpen: false,
        title: "",
        message: "",
        type: "info"
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

        // Check if current user is super_admin
        const checkAdminRole = async () => {
            const user = auth.currentUser;
            if (user?.email) {
                const admin = await adminService.getByEmail(user.email);
                if (admin?.role === "super_admin") {
                    setIsSuperAdmin(true);
                }
            }
        };
        checkAdminRole();

        // Load location and work time config
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
    }, [selectedDate]);

    const handleAddAttendance = () => {
        setSelectedAttendance(null);
        setIsModalOpen(true);
    };

    const handleEditAttendance = (attendance: Attendance) => {
        setSelectedAttendance(attendance);
        setIsModalOpen(true);
    };

    const handleDeleteAttendance = async (id: string) => {
        try {
            await attendanceService.delete(id);
            loadAttendances(selectedDate);
        } catch (error) {
            console.error("Error deleting attendance:", error);
            setAlertState({
                isOpen: true,
                title: "ผิดพลาด",
                message: "เกิดข้อผิดพลาดในการลบบันทึกการลงเวลา",
                type: "error"
            });
        }
    };

    const handleSuccess = () => {
        loadAttendances(selectedDate);
    };

    const uniqueEmployeeIds = new Set<string>();
    const lateEmployeeIds = new Set<string>();
    const checkedOutEmployeeIds = new Set<string>();
    const beforeBreakEmployeeIds = new Set<string>();
    const afterBreakEmployeeIds = new Set<string>();
    const offsiteEmployeeIds = new Set<string>();

    attendances.forEach(a => {
        if (a.status === "เข้างาน" || a.status === "สาย") {
            uniqueEmployeeIds.add(a.employeeId);
        }
        if (a.status === "สาย") {
            lateEmployeeIds.add(a.employeeId);
        }
        if (a.status === "ออกงาน") {
            checkedOutEmployeeIds.add(a.employeeId);
        }
        if (a.status === "ก่อนพัก") {
            beforeBreakEmployeeIds.add(a.employeeId);
        }
        if (a.status === "หลังพัก") {
            afterBreakEmployeeIds.add(a.employeeId);
        }
        if (a.status === "ออกนอกพื้นที่ขาไป" || a.status === "ออกนอกพื้นที่ขากลับ") {
            offsiteEmployeeIds.add(a.employeeId);
        }
    });

    const stats = {
        checkedIn: uniqueEmployeeIds.size,
        checkedOut: checkedOutEmployeeIds.size,
        late: lateEmployeeIds.size,
        beforeBreak: beforeBreakEmployeeIds.size,
        afterBreak: afterBreakEmployeeIds.size,
        offsite: offsiteEmployeeIds.size,
        total: attendances.length,
    };

    // Filter attendances
    const filteredAttendances = statusFilter
        ? attendances.filter(a => {
            if (statusFilter === "เข้างาน") return a.status === "เข้างาน" || a.status === "สาย";
            if (statusFilter === "ออกงาน") return a.status === "ออกงาน";
            if (statusFilter === "สาย") return a.status === "สาย";
            if (statusFilter === "ก่อนพัก") return a.status === "ก่อนพัก";
            if (statusFilter === "หลังพัก") return a.status === "หลังพัก";
            if (statusFilter === "นอกพื้นที่") return a.status === "ออกนอกพื้นที่ขาไป" || a.status === "ออกนอกพื้นที่ขากลับ";
            return true;
        })
        : attendances;

    return (
        <div>
            <PageHeader
                title="บันทึก"
                subtitle={`${attendances.length} results found`}
                searchPlaceholder="Employee |"
                action={
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-auto">
                            <input
                                type="date"
                                value={format(selectedDate, "yyyy-MM-dd")}
                                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                                className="w-full sm:w-auto pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            />
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                        <Button
                            onClick={handleAddAttendance}
                            className="w-full sm:w-auto bg-primary-dark text-white rounded-xl px-6 gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            บันทึกการลงเวลา
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                <div
                    onClick={() => setStatusFilter(statusFilter === "เข้างาน" ? null : "เข้างาน")}
                    className={`bg-white p-4 rounded-xl border cursor-pointer transition-all ${statusFilter === "เข้างาน" ? "border-green-500 ring-2 ring-green-200" : "border-gray-100 hover:border-gray-300"}`}
                >
                    <div className="text-xs text-gray-500">เข้างาน</div>
                    <div className={`text-2xl font-bold ${statusFilter === "เข้างาน" ? "text-green-600" : "text-gray-800"}`}>{stats.checkedIn}</div>
                </div>
                <div
                    onClick={() => setStatusFilter(statusFilter === "ออกงาน" ? null : "ออกงาน")}
                    className={`bg-white p-4 rounded-xl border cursor-pointer transition-all ${statusFilter === "ออกงาน" ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-100 hover:border-gray-300"}`}
                >
                    <div className="text-xs text-gray-500">ออกงาน</div>
                    <div className={`text-2xl font-bold ${statusFilter === "ออกงาน" ? "text-blue-600" : "text-gray-800"}`}>{stats.checkedOut}</div>
                </div>
                <div
                    onClick={() => setStatusFilter(statusFilter === "สาย" ? null : "สาย")}
                    className={`bg-white p-4 rounded-xl border cursor-pointer transition-all ${statusFilter === "สาย" ? "border-red-500 ring-2 ring-red-200" : "border-gray-100 hover:border-gray-300"}`}
                >
                    <div className="text-xs text-gray-500">สาย</div>
                    <div className={`text-2xl font-bold ${statusFilter === "สาย" ? "text-red-600" : "text-gray-800"}`}>{stats.late}</div>
                </div>
                <div
                    onClick={() => setStatusFilter(statusFilter === "ก่อนพัก" ? null : "ก่อนพัก")}
                    className={`bg-white p-4 rounded-xl border cursor-pointer transition-all ${statusFilter === "ก่อนพัก" ? "border-yellow-500 ring-2 ring-yellow-200" : "border-gray-100 hover:border-gray-300"}`}
                >
                    <div className="text-xs text-gray-500">ก่อนพัก</div>
                    <div className={`text-2xl font-bold ${statusFilter === "ก่อนพัก" ? "text-yellow-600" : "text-gray-800"}`}>{stats.beforeBreak}</div>
                </div>
                <div
                    onClick={() => setStatusFilter(statusFilter === "หลังพัก" ? null : "หลังพัก")}
                    className={`bg-white p-4 rounded-xl border cursor-pointer transition-all ${statusFilter === "หลังพัก" ? "border-orange-500 ring-2 ring-orange-200" : "border-gray-100 hover:border-gray-300"}`}
                >
                    <div className="text-xs text-gray-500">หลังพัก</div>
                    <div className={`text-2xl font-bold ${statusFilter === "หลังพัก" ? "text-orange-600" : "text-gray-800"}`}>{stats.afterBreak}</div>
                </div>
                <div
                    onClick={() => setStatusFilter(statusFilter === "นอกพื้นที่" ? null : "นอกพื้นที่")}
                    className={`bg-white p-4 rounded-xl border cursor-pointer transition-all ${statusFilter === "นอกพื้นที่" ? "border-purple-500 ring-2 ring-purple-200" : "border-gray-100 hover:border-gray-300"}`}
                >
                    <div className="text-xs text-gray-500">นอกพื้นที่</div>
                    <div className={`text-2xl font-bold ${statusFilter === "นอกพื้นที่" ? "text-purple-600" : "text-gray-800"}`}>{stats.offsite}</div>
                </div>
                <div
                    onClick={() => setStatusFilter(null)}
                    className={`bg-white p-4 rounded-xl border cursor-pointer transition-all ${statusFilter === null ? "border-gray-500 ring-2 ring-gray-200" : "border-gray-100 hover:border-gray-300"}`}
                >
                    <div className="text-xs text-gray-500">ทั้งหมด</div>
                    <div className={`text-2xl font-bold ${statusFilter === null ? "text-gray-600" : "text-gray-800"}`}>{stats.total}</div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-gray-100 border-t-primary rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-600 mt-4">กำลังโหลดข้อมูล...</p>
                </div>
            ) : (
                <AttendanceTable
                    attendances={filteredAttendances}
                    onEdit={handleEditAttendance}
                    onDelete={handleDeleteAttendance}
                    isSuperAdmin={isSuperAdmin}
                    locationEnabled={locationEnabled}
                    workTimeEnabled={workTimeEnabled}
                />
            )}

            <AttendanceFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                attendance={selectedAttendance}
                onSuccess={handleSuccess}
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
