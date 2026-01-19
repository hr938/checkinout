"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Search,
    Table,
    Users,
    FileText,
    Clock,
    BarChart2,
    HelpCircle,
    LogOut,
    Settings,
    Calculator,
    Shield,
    Timer,
    ArrowLeftRight,
    FileBarChart,
    ClipboardList,
    ChevronDown,
    Database,
    UserCog,
    FileCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAdmin } from "@/components/auth/AuthProvider";

interface MenuItem {
    icon: any;
    label: string;
    href: string;
}

interface MenuGroup {
    title: string;
    icon: any;
    items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
    {
        title: "ข้อมูล",
        icon: Database,
        items: [
            { icon: Search, label: "ค้นหา", href: "/admin/search" },
            { icon: Table, label: "ตารางข้อมูล", href: "/admin" },
            { icon: ClipboardList, label: "สรุปรายวัน", href: "/admin/summary" },
        ]
    },
    {
        title: "จัดการ",
        icon: UserCog,
        items: [
            { icon: Users, label: "พนักงาน", href: "/admin/employee" },
            { icon: Shield, label: "ผู้ดูแลระบบ", href: "/admin/admins" },
            { icon: Timer, label: "กะเวลาทำงาน", href: "/admin/shifts" },
        ]
    },
    {
        title: "คำขอ/อนุมัติ",
        icon: FileCheck,
        items: [
            { icon: FileText, label: "การลา", href: "/admin/leave" },
            { icon: Clock, label: "ขอทำงานล่วงเวลา", href: "/admin/ot" },
            { icon: ArrowLeftRight, label: "สลับวันหยุด", href: "/admin/approvals/swap" },
        ]
    },
    {
        title: "รายงาน",
        icon: BarChart2,
        items: [
            { icon: BarChart2, label: "ภาพรวม", href: "/admin/analytics" },
            { icon: FileBarChart, label: "รายงานละเอียด", href: "/admin/reports" },
            { icon: Calculator, label: "เงินเดือน", href: "/admin/payroll" },
        ]
    },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const { adminProfile } = useAdmin();
    const [openGroups, setOpenGroups] = useState<string[]>(["ข้อมูล", "จัดการ", "คำขอ/อนุมัติ", "รายงาน"]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push("/admin/login");
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const toggleGroup = (title: string) => {
        setOpenGroups(prev =>
            prev.includes(title)
                ? prev.filter(g => g !== title)
                : [...prev, title]
        );
    };

    const isGroupActive = (group: MenuGroup) => {
        return group.items.some(item => pathname === item.href);
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-[#008033] to-[#004d1f] flex flex-col shadow-xl transition-transform duration-300 ease-in-out font-sans",
                isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            )}>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none" />

                {/* Profile Section */}
                <div className="relative z-10 px-6 py-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white font-bold shadow-lg text-xl">
                            {adminProfile?.name?.charAt(0) || "A"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-lg truncate tracking-tight">
                                {adminProfile?.name || "Admin"}
                            </p>
                            <p className="text-blue-100/80 text-xs font-medium uppercase tracking-wider">
                                {adminProfile?.role || "Administrator"}
                            </p>
                        </div>
                        <Link
                            href="/admin/settings"
                            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                            onClick={onClose}
                        >
                            <Settings className="w-5 h-5" />
                        </Link>
                    </div>
                </div>

                {/* Menu Groups */}
                <nav className="flex-1 px-4 overflow-y-auto space-y-6 relative z-10">
                    {menuGroups.map((group) => {
                        const isExpanded = openGroups.includes(group.title);
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const groupActive = isGroupActive(group);

                        return (
                            <div key={group.title}>
                                <div className="px-3 mb-2 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                                        {group.title}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={onClose}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                                                    isActive
                                                        ? "bg-white text-[#00BF4D] shadow-lg shadow-black/5"
                                                        : "text-white/80 hover:bg-white/10 hover:text-white"
                                                )}
                                            >
                                                <item.icon className={cn(
                                                    "w-4.5 h-4.5 transition-colors",
                                                    isActive ? "text-[#00BF4D]" : "text-white/70 group-hover:text-white"
                                                )} />
                                                <span className="relative z-10">{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Bottom Actions */}
                <div className="p-4 relative z-10 mt-auto">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white/90 bg-green-900 hover:bg-red-800 "
                    >
                        <LogOut className="w-4 h-4" />
                        ออกจากระบบ
                    </button>
                    <p className="text-[10px] text-center text-white/40 mt-4 font-medium">v1.2.0 Check-In System</p>
                </div>
            </aside>
        </>
    );
}
