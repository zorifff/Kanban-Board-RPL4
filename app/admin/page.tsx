"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import CustomModal from "@/app/components/CustomModal";

type Task = {
  id_task: number;
  judul_task: string;
  deskripsi: string;
  status: string;
  deadline: string;
  id_user: number;
  id_kategori: number;
  kategori: {
    nama_kategori: string;
    kode_warna: string;
  };
};

type User = {
  id_user: number;
  nama_lengkap: string;
  email: string;
};

import { Suspense } from "react";

function AdminContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectTitle, setProjectTitle] = useState("");

  const [sortOption, setSortOption] = useState("default");
  const [filterUser, setFilterUser] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    judul_task: "",
    deskripsi: "",
    id_user: "",
    id_kategori: "",
    deadline: ""
  });

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type: "alert" | "confirm";
    variant: "info" | "success" | "warning" | "danger";
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, message: "", type: "alert", variant: "info", onConfirm: () => {} });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tasks (filtered by project if projectId exists)
        const tasksUrl = projectId ? `/api/tasks?projectId=${projectId}` : "/api/tasks";
        const [resTasks, resCats] = await Promise.all([
          fetch(tasksUrl),
          fetch("/api/categories")
        ]);
        const dbTasks = await resTasks.json();
        const dbCats = await resCats.json();
        setTasks(dbTasks);
        setCategories(dbCats);

        // Fetch users: only project members if projectId, otherwise all users
        if (projectId) {
          const resProject = await fetch(`/api/projects/${projectId}`);
          if (resProject.ok) {
            const projData = await resProject.json();
            setProjectTitle(projData.nama_project || "");
            const projectMembers = (projData.members || []).map((m: any) => ({
              id_user: m.user.id_user,
              nama_lengkap: m.user.nama_lengkap,
              email: m.user.email,
            }));
            setUsers(projectMembers);
          }
        } else {
          const resUsers = await fetch("/api/users");
          const dbUsers = await resUsers.json();
          setUsers(dbUsers);
        }
      } catch (error) {
        console.error("Gagal mengambil data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  const formatDeadline = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  const getUserName = (id_user: number) => {
    const user = users.find((u) => u.id_user === id_user);
    return user ? user.nama_lengkap : "Unknown";
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    const formattedDate = task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : "";
    setFormData({
      judul_task: task.judul_task || "",
      deskripsi: task.deskripsi || "",
      id_user: task.id_user ? task.id_user.toString() : "",
      id_kategori: task.id_kategori ? task.id_kategori.toString() : "",
      deadline: formattedDate
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_task: editingTask.id_task,
          ...formData
        }),
      });
      const responseData = await response.json();

      setTasks(tasks.map(t => t.id_task === editingTask.id_task ? {
        ...t,
        judul_task: responseData.judul_task,
        deskripsi: responseData.deskripsi,
        id_user: responseData.id_user,
        id_kategori: responseData.id_kategori,
        deadline: responseData.deadline,
        kategori: responseData.kategori
      } : t));

      setIsModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error("Terjadi kesalahan:", error);
      setModalState({ isOpen: true, message: "Gagal menyimpan tugas.", type: "alert", variant: "danger", onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
    }
  };

  // Logika Filter
  let filteredTasks = tasks;
  if (filterUser !== "all") {
    filteredTasks = filteredTasks.filter((t) => t.id_user.toString() === filterUser);
  }

  // Logika Sortir
  let sortedTasks = [...filteredTasks];
  if (sortOption === "A-Z") {
    sortedTasks.sort((a, b) => (a.judul_task || "").localeCompare(b.judul_task || ""));
  } else if (sortOption === "Z-A") {
    sortedTasks.sort((a, b) => (b.judul_task || "").localeCompare(a.judul_task || ""));
  } else if (sortOption === "Deadline-Terdekat") {
    sortedTasks.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  } else if (sortOption === "Deadline-Terjauh") {
    sortedTasks.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar */}
      <div className="w-full h-16 sm:h-20 bg-white shadow-sm border-b border-slate-200 px-8 flex justify-between items-center z-50 relative flex-shrink-0">
        <div className="flex items-center gap-2 mt-2">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="relative w-9 h-9">
                <div className="w-1.5 h-6 absolute left-[3.50px] top-[4.66px] overflow-hidden">
                  <div className="w-1.5 h-1.5 absolute left-0 top-0 bg-blue-500" />
                  <div className="w-1.5 h-1 absolute left-0 top-[7px] bg-blue-500/80" />
                  <div className="w-1.5 h-1.5 absolute left-0 top-[12.83px] bg-blue-500/60" />
                  <div className="w-1.5 h-1 absolute left-0 top-[21px] bg-blue-500/40" />
                </div>
                <div className="w-1.5 h-6 absolute left-[14px] top-[4.66px] overflow-hidden">
                  <div className="w-1.5 h-2 absolute left-0 top-0 bg-blue-400" />
                  <div className="w-1.5 h-1.5 absolute left-0 top-[9.33px] bg-blue-400/70" />
                  <div className="w-1.5 h-2.5 absolute left-0 top-[16.33px] bg-blue-400/50" />
                </div>
                <div className="w-1.5 h-6 absolute left-[24.50px] top-[4.66px] overflow-hidden">
                  <div className="w-1.5 h-1 absolute left-0 top-0 bg-blue-300" />
                  <div className="w-1.5 h-1.5 absolute left-0 top-[5.83px] bg-blue-300/80" />
                  <div className="w-1.5 h-1.5 absolute left-0 top-[12.83px] bg-blue-300/60" />
                  <div className="w-1.5 h-1.5 absolute left-0 top-[19.25px] bg-blue-300/50" />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center">
                  <span className="text-blue-500 text-xl font-bold font-['Inter'] leading-8">Four</span>
                  <span className="text-blue-300 text-xl font-bold font-['Inter'] leading-8">Ban</span>
                </div>
                <div className="text-blue-200 text-[8px] font-medium font-['Inter'] leading-[8px] tracking-[0.08em] mt-[-4px]">
                  PROJECT MANAGEMENT
                </div>
              </div>
            </div>
          </Link>
        </div>

        <Link href={projectId ? `/board/${projectId}` : "/"}>
          <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back to Board
          </button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-8 max-w-[1200px] w-full mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-['Inter']">{projectTitle ? `Tasks - ${projectTitle}` : "All Tasks"}</h1>
            <p className="text-sm text-slate-500">{projectTitle ? `Monitor and manage tasks in project ${projectTitle}.` : "Monitor and manage all tasks in FourBan."}</p>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="appearance-none border border-slate-200 rounded-lg bg-white text-sm font-medium px-4 py-2 pr-10 text-slate-700 outline-none hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
              >
                <option value="all">All Members</option>
                {users.map((u) => (
                  <option key={u.id_user} value={u.id_user.toString()}>
                    {u.nama_lengkap}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>

            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="appearance-none border border-slate-200 rounded-lg bg-white text-sm font-medium px-4 py-2 pr-10 text-slate-700 outline-none hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
              >
                <option value="default">Sort by: Default</option>
                <option value="A-Z">Alphabetical (A - Z)</option>
                <option value="Z-A">Alphabetical (Z - A)</option>
                <option value="Deadline-Terdekat">Deadline (Nearest)</option>
                <option value="Deadline-Terjauh">Deadline (Furthest)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabel Data */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Task</th>
                  <th className="px-6 py-4">Assignee</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Deadline</th>
                  <th className="px-6 py-4 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                      Loading data...
                    </td>
                  </tr>
                ) : sortedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                      No tasks found.
                    </td>
                  </tr>
                ) : (
                  sortedTasks.map((task) => {
                    let statusBadge = "";
                    if (task.status === "TODO") statusBadge = "bg-slate-100 text-slate-700";
                    else if (task.status === "DOING") statusBadge = "bg-orange-100 text-orange-700";
                    else if (task.status === "DONE") statusBadge = "bg-green-100 text-green-700";

                    return (
                      <tr key={task.id_task} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-slate-800 text-sm line-clamp-1">{task.judul_task}</span>
                            <span className="text-xs text-slate-500 flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{ backgroundColor: task.kategori?.kode_warna || "#ccc" }}
                              ></span>
                              {task.kategori?.nama_kategori || "General"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {getUserName(task.id_user)[0]?.toUpperCase() || "?"}
                            </div>
                            <span className="text-sm text-slate-700 font-medium">{getUserName(task.id_user)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${statusBadge}`}>
                            {task.status === "TODO" ? "To-Do" : task.status === "DOING" ? "In Progress" : "Done"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDeadline(task.deadline)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleEditClick(task)}
                            className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors inline-flex items-center justify-center"
                            title="Edit Task"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Form Edit Tugas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-gradient-to-br from-[#F5FEFF] to-[#E2EAF4] w-full max-w-3xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
              {/* Header Modal */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#0E2F76]">
                  {editingTask ? editingTask.judul_task : "Edit Task"}
                </h2>
                <p className="text-[#0E2F76]/60 text-sm mt-1">
                  Update the information below to modify the task
                </p>
              </div>

              {/* Form Input */}
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Kolom Kiri */}
                  <div className="flex flex-col gap-5 h-full">
                    <div>
                      <label className="block text-sm font-semibold text-[#0E2F76] mb-2">Task Title</label>
                      <input
                        type="text"
                        placeholder="Task Title..."
                        value={formData.judul_task}
                        required
                        className="w-full border border-indigo-100 bg-white/80 shadow-sm p-3 rounded-xl text-sm focus:ring-2 focus:ring-[#0E2F76] outline-none transition"
                        onChange={(e) => setFormData({ ...formData, judul_task: e.target.value })}
                      />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <label className="block text-sm font-semibold text-[#0E2F76] mb-2">Task Description</label>
                      <textarea
                        placeholder="Give a description of the task..."
                        value={formData.deskripsi}
                        className="w-full flex-1 border border-indigo-100 bg-white/80 shadow-sm p-3 rounded-xl text-sm focus:ring-2 focus:ring-[#0E2F76] outline-none resize-none transition"
                        onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                      ></textarea>
                    </div>
                  </div>

                  {/* Kolom Kanan */}
                  <div className="flex flex-col gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-[#0E2F76] mb-2">Assignee</label>
                      <select
                        required
                        value={formData.id_user}
                        className="w-full border border-indigo-100 bg-white/80 shadow-sm p-3 rounded-xl text-sm focus:ring-2 focus:ring-[#0E2F76] outline-none transition"
                        onChange={(e) => setFormData({ ...formData, id_user: e.target.value })}
                      >
                        <option value="">Select Assignee...</option>
                        {users.map(u => <option key={u.id_user} value={u.id_user.toString()}>{u.nama_lengkap}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#0E2F76] mb-2">Category</label>
                      <select
                        required
                        value={formData.id_kategori}
                        className="w-full border border-indigo-100 bg-white/80 shadow-sm p-3 rounded-xl text-sm focus:ring-2 focus:ring-[#0E2F76] outline-none transition"
                        onChange={(e) => setFormData({ ...formData, id_kategori: e.target.value })}
                      >
                        <option value="">Select Category...</option>
                        {categories.map(c => <option key={c.id_kategori} value={c.id_kategori.toString()}>{c.nama_kategori}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#0E2F76] mb-2">Deadline</label>
                      <input
                        type="date"
                        required
                        value={formData.deadline}
                        className="w-full border border-indigo-100 bg-white/80 shadow-sm p-3 rounded-xl text-sm focus:ring-2 focus:ring-[#0E2F76] outline-none transition"
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Tombol Aksi */}
                <div className="flex justify-end gap-3 mt-8">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingTask(null);
                    }}
                    className="px-6 py-2.5 bg-white border border-slate-200 shadow-sm text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#0E2F76] shadow-md text-white font-medium rounded-xl hover:bg-blue-900 transition"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal */}
      <CustomModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        variant={modalState.variant}
        onConfirm={modalState.onConfirm}
        onCancel={modalState.onCancel}
      />
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminContent />
    </Suspense>
  );
}
