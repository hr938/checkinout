"use client";

import { useEffect, useState } from "react";
import { EmployeeFormModal } from "@/components/employee/EmployeeFormModal";
import { Button } from "@/components/ui/button";
import { Search, Filter, ChevronLeft, ChevronRight, Users, Briefcase, Building, Phone, MoreHorizontal, UserPlus, Eye, Edit2, Trash2, Mail } from "lucide-react";
import { employeeService, type Employee, adminLogService } from "@/lib/firestore";
import { useAdmin } from "@/components/auth/AuthProvider";
import { CustomAlert } from "@/components/ui/custom-alert";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function EmployeePage() {
    const { user } = useAdmin();

    // Data States
    const [allEmployeesCache, setAllEmployeesCache] = useState<Employee[]>([]); // Note: Store all fetched data
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    // Remove complex pagination states that are not needed for client-side
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "ทำงาน" | "ลาออก" | "พ้นสภาพ">("ทำงาน");
    const [typeFilter, setTypeFilter] = useState<"all" | "รายเดือน" | "รายวัน" | "ชั่วคราว">("all");

    // Modal & Actions
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string; type: "success" | "error" | "warning" | "info" }>({
        isOpen: false, title: "", message: "", type: "info"
    });

    const ITEMS_PER_PAGE = 20;

    const loadEmployees = async () => {
        setLoading(true);
        try {
            // Fetch ALL data once (Client-side strategy to bypass Firestore complex query index/permission issues)
            const all = await employeeService.getAll();
            setAllEmployeesCache(all);

            applyFiltersAndPagination(all, 1, searchQuery, statusFilter, typeFilter);

        } catch (error) {
            console.error("Error loading employees:", error);
            setAlertState({ isOpen: true, title: "Error", message: "ไม่สามารถโหลดข้อมูลพนักงานได้ (Permission/Network)", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const applyFiltersAndPagination = (data: Employee[], currentPage: number, search: string, status: string, type: string) => {
        let filtered = data;

        // 1. Search
        if (search) {
            const query = search.toLowerCase();
            filtered = filtered.filter(e =>
                e.name.toLowerCase().includes(query) ||
                e.employeeId?.toLowerCase().includes(query) ||
                e.position?.toLowerCase().includes(query)
            );
        }

        // 2. Status Filter
        if (status !== "all") {
            filtered = filtered.filter(e => (e.status || "ทำงาน") === status);
        }

        // 3. Type Filter
        if (type !== "all") {
            filtered = filtered.filter(e => e.type === type);
        }

        // 4. Pagination
        const total = filtered.length;
        setTotalPages(Math.ceil(total / ITEMS_PER_PAGE) || 1);

        // Ensure page is valid
        const validPage = Math.min(Math.max(1, currentPage), Math.ceil(total / ITEMS_PER_PAGE) || 1);
        setPage(validPage);

        const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedData = filtered.slice(startIndex, endIndex);

        setEmployees(paginatedData);
    };

    // Effect to apply filters when criteria changes (using cache)
    useEffect(() => {
        if (allEmployeesCache.length > 0) {
            applyFiltersAndPagination(allEmployeesCache, 1, searchQuery, statusFilter, typeFilter);
        }
    }, [searchQuery, statusFilter, typeFilter]);

    // Initial Load
    useEffect(() => {
        loadEmployees();
    }, []);

    const handleNextPage = () => {
        if (page < totalPages) {
            applyFiltersAndPagination(allEmployeesCache, page + 1, searchQuery, statusFilter, typeFilter);
        }
    };

    const handlePrevPage = () => {
        if (page > 1) {
            applyFiltersAndPagination(allEmployeesCache, page - 1, searchQuery, statusFilter, typeFilter);
        }
    };

    const handleAdd = () => {
        setSelectedEmployee(null);
        setIsReadOnly(false);
        setIsModalOpen(true);
    };

    const handleEdit = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsReadOnly(false);
        setIsModalOpen(true);
    };

    const handleView = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsReadOnly(true);
        setIsModalOpen(true);
    };

    const handleDelete = async (employee: Employee) => {
        if (!confirm(`ยืนยันการลบพนักงาน ${employee.name}?`)) return;
        try {
            if (employee.id) {
                await employeeService.delete(employee.id);
                await adminLogService.create({
                    adminId: user?.uid || "unknown",
                    adminName: user?.email || "Unknown",
                    action: "delete",
                    module: "employee",
                    target: employee.name,
                    details: `ลบพนักงาน: ${employee.name}`
                });
                loadEmployees();
            }
        } catch (error) {
            setAlertState({ isOpen: true, title: "Error", message: "ลบไม่สำเร็จ", type: "error" });
        }
    };

    return (
        <div className="flex-1 space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">รายชื่อพนักงาน</h1>
                    <p className="text-sm text-gray-500 mt-1">จัดการข้อมูลพนักงานในระบบ ({employees.length} รายการ)</p>
                </div>
                <Button
                    onClick={handleAdd}
                    className="w-full md:w-auto bg-primary-dark hover:bg-primary-dark/90 text-white rounded-lg px-4 gap-2 h-10 shadow-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    เพิ่มพนักงาน
                </Button>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                {/* Search */}
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อ, รหัส, ตำแหน่ง..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <div className="relative min-w-[140px]">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer hover:bg-gray-50"
                        >
                            <option value="all">สถานะทั้งหมด</option>
                            <option value="ทำงาน">กำลังทำงาน</option>
                            <option value="ลาออก">ลาออก</option>
                            <option value="พ้นสภาพ">พ้นสภาพ</option>
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="relative min-w-[140px]">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as any)}
                            className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer hover:bg-gray-50"
                        >
                            <option value="all">ประเภททั้งหมด</option>
                            <option value="รายเดือน">รายเดือน</option>
                            <option value="รายวัน">รายวัน</option>
                            <option value="ชั่วคราว">ชั่วคราว</option>
                        </select>
                        <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[300px]">พนักงาน</th>
                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ตำแหน่ง/สังกัด</th>
                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">ประเภท</th>
                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">สถานะ</th>
                                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-[140px]">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="flex gap-4 animate-pulse">
                                                <div className="w-9 h-9 bg-gray-100 rounded-full"></div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                                                    <div className="h-2 bg-gray-100 rounded w-1/3"></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : employees.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <div className="p-3 bg-gray-50 rounded-full mb-3">
                                                <Users className="w-6 h-6 opacity-30" />
                                            </div>
                                            <p className="text-sm">ไม่พบข้อมูลพนักงาน</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp) => (
                                    <tr key={emp.id} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 border border-indigo-200">
                                                    {emp.name?.charAt(0) || "U"}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 text-sm leading-none mb-1">{emp.name}</div>
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono">
                                                            {emp.employeeId || "No ID"}
                                                        </span>
                                                        {emp.phone && (
                                                            <span className="flex items-center gap-0.5" title={emp.phone}>
                                                                <Phone className="w-2.5 h-2.5" />
                                                            </span>
                                                        )}
                                                        {emp.email && (
                                                            <span className="flex items-center gap-0.5" title={emp.email}>
                                                                <Mail className="w-2.5 h-2.5" />
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="text-gray-900 text-xs font-medium">{emp.position || "-"}</div>
                                            <div className="text-gray-500 text-[10px] flex items-center gap-1">
                                                {emp.department || "-"}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={cn(
                                                "inline-flex px-2 py-0.5 rounded text-[10px] font-medium border",
                                                emp.type === "รายเดือน" ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                    emp.type === "รายวัน" ? "bg-orange-50 text-orange-700 border-orange-100" :
                                                        "bg-purple-50 text-purple-700 border-purple-100"
                                            )}>
                                                {emp.type || "รายเดือน"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={cn(
                                                "inline-flex items-center justify-center min-w-[60px] px-2 py-0.5 rounded-full text-[10px] font-medium border",
                                                (emp.status || 'ทำงาน') === 'ทำงาน' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                                            )}>
                                                {emp.status || "ทำงาน"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleView(emp)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="ดูรายละเอียด">
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleEdit(emp)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors" title="แก้ไข">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleDelete(emp)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="ลบ">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!searchQuery && (
                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                            หน้า {page} (ทั้งหมด {totalPages} หน้า)
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handlePrevPage}
                                disabled={page === 1 || loading}
                                className="p-1.5 rounded hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-gray-600"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleNextPage}
                                disabled={page >= totalPages || loading}
                                className="p-1.5 rounded hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-gray-600"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <EmployeeFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                employee={selectedEmployee}
                readOnly={isReadOnly}
                onSuccess={() => loadEmployees()}
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
