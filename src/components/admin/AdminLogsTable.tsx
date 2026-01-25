
"use client";

import { useEffect, useState } from "react";
import { AdminLog, adminLogService } from "@/lib/firestore";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Search, RotateCw } from "lucide-react";

export function AdminLogsTable() {
    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const { data, lastDoc: last } = await adminLogService.getHistoryPaginated(20);
            setLogs(data);
            setLastDoc(last);
            setHasMore(!!last);
        } catch (error) {
            console.error("Error loading logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = async () => {
        if (!lastDoc || loadingMore) return;
        setLoadingMore(true);
        try {
            const { data, lastDoc: last } = await adminLogService.getHistoryPaginated(20, lastDoc);
            setLogs(prev => [...prev, ...data]);
            setLastDoc(last);
            setHasMore(!!last);
        } catch (error) {
            console.error("Error loading more logs:", error);
        } finally {
            setLoadingMore(false);
        }
    };

    const getActionBadge = (action: AdminLog["action"]) => {
        switch (action) {
            case "create": return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">สร้าง</span>;
            case "update": return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">แก้ไข</span>;
            case "delete": return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">ลบ</span>;
            case "approve": return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">อนุมัติ</span>;
            case "reject": return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">ไม่อนุมัติ</span>;
            case "login": return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">เข้าสู่ระบบ</span>;
            default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium">{action}</span>;
        }
    };

    const getModuleLabel = (module: AdminLog["module"]) => {
        switch (module) {
            case "employee": return "พนักงาน";
            case "attendance": return "ลงเวลา";
            case "leave": return "การลา";
            case "ot": return "OT";
            case "admin": return "ผู้ดูแล";
            case "setting": return "ตั้งค่า";
            case "payroll": return "เงินเดือน";
            default: return module;
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <RotateCw className="w-4 h-4 text-gray-400" />
                    ประวัติการทำงาน
                </h3>
                <button
                    onClick={loadLogs}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                    รีเฟรชข้อมูล
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="px-4 py-3">วันเวลา</th>
                            <th className="px-4 py-3">ผู้ดำเนินการ</th>
                            <th className="px-4 py-3">กิจกรรม</th>
                            <th className="px-4 py-3">โมดูล</th>
                            <th className="px-4 py-3">รายละเอียด</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                    กำลังโหลด...
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                    ไม่มีประวัติการทำงาน
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                        {format(log.timestamp || new Date(), "d MMM yy HH:mm", { locale: th })}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {log.adminName}
                                    </td>
                                    <td className="px-4 py-3">
                                        {getActionBadge(log.action)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {getModuleLabel(log.module)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 max-w-sm truncate" title={log.details}>
                                        {log.details}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {hasMore && !loading && (
                <div className="p-4 text-center border-t border-gray-100">
                    <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                    >
                        {loadingMore ? "กำลังโหลด..." : "ดูเพิ่มเติม"}
                    </button>
                </div>
            )}
        </div>
    );
}
