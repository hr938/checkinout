"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AdminTable } from "@/components/admin/AdminTable"; // We might need to adjust this component too or inline table
import { AdminFormModal } from "@/components/admin/AdminFormModal";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, ChevronLeft, ChevronRight, Shield, ShieldCheck, Mail, Clock, Activity, Users } from "lucide-react";
import { adminService, adminLogService, type Admin } from "@/lib/firestore";
import { useAdmin } from "@/components/auth/AuthProvider";
import { AdminLogsTable } from "@/components/admin/AdminLogsTable";
import { format } from "date-fns";
import { th } from "date-fns/locale";

export default function AdminsPage() {
    const { user, isSuperAdmin } = useAdmin();
    const [activeTab, setActiveTab] = useState<"admins" | "logs">("admins");

    // Data States
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [lastDoc, setLastDoc] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [prevDocs, setPrevDocs] = useState<any[]>([]); // Stack for checking back
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    // Filter & Search
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "super_admin">("all");

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);

    const ITEMS_PER_PAGE = 10;

    const loadAdmins = async (isNext: boolean = true, docRef: any = null) => {
        setLoading(true);
        try {
            // For search, we might fallback to client-side filter if firestore search is too complex
            // But here we implement pagination logic
            const { data, lastDoc: newLastDoc } = await adminService.getPaginated(ITEMS_PER_PAGE, docRef);

            // Client-side filtering for search (Firestore limitations)
            let filtered = data;
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                filtered = data.filter(a =>
                    a.name.toLowerCase().includes(query) ||
                    a.email.toLowerCase().includes(query)
                );
            }

            if (roleFilter !== "all") {
                filtered = filtered.filter(a => a.role === roleFilter);
            }

            setAdmins(filtered);
            setLastDoc(newLastDoc);
            setHasMore(!!newLastDoc);
        } catch (error) {
            console.error("Error loading admins:", error);
        } finally {
            setLoading(false);
        }
    };

    // Initial Load & Search Debounce
    useEffect(() => {
        // If searching, we skip pagination logic for now and fetch all (or implement better search)
        // For this demo, let's reload first page
        loadAdmins(true, null);
        setPage(1);
        setPrevDocs([]);
    }, [searchQuery, roleFilter]); // Trigger on filter change

    const handleNextPage = () => {
        if (!hasMore) return;
        setPrevDocs([...prevDocs, lastDoc]); // Save current lastDoc
        setPage(p => p + 1);
        loadAdmins(true, lastDoc);
    };

    const handlePrevPage = () => {
        if (page <= 1) return;
        const newPrevDocs = [...prevDocs];
        const prevDoc = newPrevDocs.pop(); // Not exactly right for cursor pagination unless we store startAt. 
        // Cursor pagination backwards is tricky in Firestore. 
        // Simplified: Reset to page 1 for now or use specific library.
        // For Formal UI: Let's just Reload Page 1 when clicking back if simple.
        // OR better: Just keeping it simple for now -> Reset
        setPage(1);
        setPrevDocs([]);
        loadAdmins(true, null);
    };

    const handleAddAdmin = () => {
        setSelectedAdmin(null);
        setIsModalOpen(true);
    };

    const handleEditAdmin = (admin: Admin) => {
        setSelectedAdmin(admin);
        setIsModalOpen(true);
    };

    const handleDeleteAdmin = async (admin: Admin) => {
        if (!confirm(`ต้องการลบผู้ดูแล ${admin.email} ใช่หรือไม่?`)) return;
        try {
            if (admin.id) {
                await adminService.delete(admin.id);
                // Log
                await adminLogService.create({
                    adminId: user?.uid || "unknown",
                    adminName: user?.email || "Unknown",
                    action: "delete",
                    module: "admin",
                    target: admin.email,
                    details: `ลบผู้ดูแลระบบ: ${admin.email}`
                });
                loadAdmins(true, null); // Reload
            }
        } catch (error) {
            console.error("Error deleting admin:", error);
            alert("เกิดข้อผิดพลาด");
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ผู้ดูแลระบบ</h1>
                    <p className="text-sm text-gray-500 mt-1">จัดการสิทธิ์การเข้าถึงและตรวจสอบการทำงานของผู้ดูแลระบบ</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab("admins")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "admins"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            รายชื่อผู้ดูแล
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab("logs")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "logs"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <span className="flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            บันทึกกิจกรรม
                        </span>
                    </button>
                </div>
            </div>

            {activeTab === "admins" ? (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-1 gap-4 w-full md:w-auto">
                            <div className="relative flex-1 md:max-w-xs">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="ค้นหาชื่อ หรือ อีเมล..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value as any)}
                                    className="pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none cursor-pointer"
                                >
                                    <option value="all">ทุกบทบาท</option>
                                    <option value="super_admin">Super Admin</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 hidden md:block">
                                ทั้งหมด <span className="font-semibold text-gray-900">{admins.length}</span> คน
                            </div>
                            <Button
                                onClick={handleAddAdmin}
                                className="bg-primary-dark hover:bg-primary-dark/90 text-white shadow-lg shadow-primary/20 rounded-lg px-4"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                เพิ่มผู้ดูแล
                            </Button>
                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-gray-700 w-1/3">ผู้ดูแลระบบ</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">บทบาท</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">วันที่สร้าง</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700">เข้าใช้งานล่าสุด</th>
                                        <th className="px-6 py-4 font-semibold text-gray-700 text-right">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        [...Array(5)].map((_, i) => (
                                            <tr key={i}>
                                                <td colSpan={5} className="px-6 py-4">
                                                    <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4"></div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : admins.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-400">
                                                    <Shield className="w-12 h-12 mb-3 opacity-20" />
                                                    <p>ไม่พบข้อมูลผู้ดูแลระบบ</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        admins.map((admin) => (
                                            <tr key={admin.id} className="group hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary-dark font-semibold border border-primary/10">
                                                            {admin.name?.charAt(0).toUpperCase() || "A"}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900">{admin.name}</div>
                                                            <div className="text-gray-500 text-xs flex items-center gap-1">
                                                                <Mail className="w-3 h-3" />
                                                                {admin.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {admin.role === "super_admin" ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                                            <ShieldCheck className="w-3 h-3 mr-1" />
                                                            Super Admin
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                            <Shield className="w-3 h-3 mr-1" />
                                                            Admin
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-3 h-3 text-gray-400" />
                                                        {admin.createdAt ? format(admin.createdAt, "d MMM yyyy", { locale: th }) : "-"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {admin.lastLogin ? format(admin.lastLogin, "d MMM yyyy HH:mm", { locale: th }) : <span className="text-gray-400">-</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEditAdmin(admin)}
                                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium px-2 py-1 hover:bg-blue-50 rounded"
                                                        >
                                                            แก้ไข
                                                        </button>
                                                        {/* Allow admins to delete other admins, but protect Super Admin if needed logic */}
                                                        <button
                                                            onClick={() => handleDeleteAdmin(admin)}
                                                            className="text-sm text-red-600 hover:text-red-800 font-medium px-2 py-1 hover:bg-red-50 rounded"
                                                        >
                                                            ลบ
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                                แสดงหน้า {page}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={page === 1 || loading}
                                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                                </button>
                                <button
                                    onClick={handleNextPage}
                                    disabled={!hasMore || loading}
                                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-in slide-in-from-right-4 duration-300">
                    <AdminLogsTable />
                </div>
            )}

            <AdminFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                admin={selectedAdmin}
                onSuccess={() => loadAdmins(true, null)}
            />
        </div>
    );
}
