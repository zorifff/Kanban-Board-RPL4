"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useSession, signOut } from "next-auth/react";
import DeadlineBadge from "./DeadlineBadge";
import CustomModal from "./CustomModal";

// 1. Definisi Tipe Data (Sesuai SRS)
type Task = {
  id: string;
  dbId: number;
  content: string;
  judul_task: string;
  id_user: number;
  id_kategori: number;
  deadline: string;
  kategori: string;
  warnaKategori: string;
  nama_user?: string;
};

type BoardData = {
  columns: Record<string, { id: string; title: string; taskIds: string[] }>;
  tasks: Record<string, Task>;
  columnOrder: string[];
};

const initialBoardData: BoardData = {
  columns: {
    "TODO": { id: "TODO", title: "TO DO", taskIds: [] },
    "DOING": { id: "DOING", title: "IN PROGRES", taskIds: [] },
    "DONE": { id: "DONE", title: "DONE", taskIds: [] },
  },
  tasks: {},
  columnOrder: ["TODO", "DOING", "DONE"],
};

export default function KanbanBoard({ projectId }: { projectId?: number }) {
  // --- STATE ---
  const [data, setData] = useState<BoardData>(initialBoardData);
  const [isLoading, setIsLoading] = useState(true);
  const [projectRole, setProjectRole] = useState("admin"); // Default admin if no project
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    judul_task: "",
    deskripsi: "",
    id_user: "",
    id_kategori: "",
    deadline: ""
  });
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const { data: session } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isViewProfileModalOpen, setIsViewProfileModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState("default");
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type: "alert" | "confirm";
    variant: "info" | "success" | "warning" | "danger";
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, message: "", type: "alert", variant: "info", onConfirm: () => {} });
  
  // Backward compatibility untuk handleSort lama jika ada yg pakai
  const [sortOption, setSortOption] = useState<string>("A-Z");
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  // --- HELPER FUNCTION ---
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDeadline = (dateString: string) => {
    if (!dateString) return "No deadline";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  // --- FETCH DATA AWAL ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resTasks, resCats] = await Promise.all([
          fetch(`/api/tasks${projectId ? '?projectId=' + projectId : ''}`),
          fetch('/api/categories')
        ]);

        const dbTasks = await resTasks.json();
        const dbCats = await resCats.json();

        let userRole = "admin";
        let projTitle = "";
        let projDesc = "";
        let dbUsers: any[] = [];

        if (projectId) {
          const resProj = await fetch(`/api/projects/${projectId}`);
          if (resProj.ok) {
            const projData = await resProj.json();
            userRole = projData.currentUserRole || "member";
            projTitle = projData.nama_project || "";
            projDesc = projData.deskripsi || "";
            // Extract user data from project members
            dbUsers = (projData.members || []).map((m: any) => ({
              id_user: m.user.id_user,
              nama_lengkap: m.user.nama_lengkap,
              email: m.user.email,
              username: m.user.username
            }));
          }
        } else {
          // Fallback: fetch all users if not in a project context
          const resUsers = await fetch('/api/users');
          dbUsers = await resUsers.json();
        }

        setProjectRole(userRole);
        setProjectTitle(projTitle);
        setProjectDesc(projDesc);

        setUsers(dbUsers);
        setCategories(dbCats);

        // Buat mapping user untuk mendapatkan nama berdasarkan id_user
        const userMap = dbUsers.reduce((map: any, user: any) => {
          map[user.id_user] = user.nama_lengkap;
          return map;
        }, {});

        const newData = JSON.parse(JSON.stringify(initialBoardData));
        dbTasks.forEach((task: any) => {
          const taskId = `task-${task.id_task}`;
          newData.tasks[taskId] = {
            id: taskId,
            dbId: task.id_task,
            content: task.deskripsi || "No Description",
            judul_task: task.judul_task || "",
            id_user: task.id_user || "",
            id_kategori: task.id_kategori || "",
            deadline: task.deadline || "",
            kategori: task.kategori?.nama_kategori || "General",
            warnaKategori: task.kategori?.kode_warna || "#ccc",
            nama_user: userMap[task.id_user] || "Unknown"
          };

          const status = task.status || "TODO";
          if (newData.columns[status]) {
            newData.columns[status].taskIds.push(taskId);
          }
        });

        setData(newData);
      } catch (error) {
        console.error("Gagal mengambil data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- SORTING LOGIC ---
  const handleSort = (option: string) => {
    setSortOption(option);
    setIsSortMenuOpen(false);

    const newData = { ...data };
    
    const sortTasks = (taskIds: string[], sortType: string) => {
      return taskIds.slice().sort((aId, bId) => {
        const taskA = newData.tasks[aId];
        const taskB = newData.tasks[bId];
        
        if (sortType === "A-Z") {
          return taskA.judul_task.localeCompare(taskB.judul_task);
        } else if (sortType === "Z-A") {
          return taskB.judul_task.localeCompare(taskA.judul_task);
        } else if (sortType === "Category (Low - High)") {
          const priority = { "low": 1, "medium": 2, "high": 3 } as Record<string, number>;
          const pA = priority[taskA.kategori.toLowerCase()] || 0;
          const pB = priority[taskB.kategori.toLowerCase()] || 0;
          return pA - pB;
        } else if (sortType === "Category (High - Low)") {
          const priority = { "low": 1, "medium": 2, "high": 3 } as Record<string, number>;
          const pA = priority[taskA.kategori.toLowerCase()] || 0;
          const pB = priority[taskB.kategori.toLowerCase()] || 0;
          return pB - pA;
        } else if (sortType === "Deadline (Nearest)") {
          if (!taskA.deadline && !taskB.deadline) return 0;
          if (!taskA.deadline) return 1;
          if (!taskB.deadline) return -1;
          return new Date(taskA.deadline).getTime() - new Date(taskB.deadline).getTime();
        } else if (sortType === "Deadline (Furthest)") {
          if (!taskA.deadline && !taskB.deadline) return 0;
          if (!taskA.deadline) return 1;
          if (!taskB.deadline) return -1;
          return new Date(taskB.deadline).getTime() - new Date(taskA.deadline).getTime();
        }
        return 0;
      });
    };

    newData.columnOrder.forEach(colId => {
      newData.columns[colId].taskIds = sortTasks(newData.columns[colId].taskIds, option);
    });

    setData(newData);
  };

  // --- HANDLER UNTUK MEMBUKA DETAIL TASK ---
  const handleTaskClick = async (task: any) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
    setOpenMenuTaskId(null);

    // Fetch comments
    setIsLoadingComments(true);
    try {
      const res = await fetch(`/api/comments?taskId=${task.dbId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  // --- HANDLER UNTUK EDIT TASK DARI MENU ---
  const handleEditFromMenu = (task: any) => {
    setEditingTask(task);
    const formattedDate = task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : "";
    setFormData({
      judul_task: task.judul_task || "",
      deskripsi: task.content || "",
      id_user: task.id_user ? task.id_user.toString() : "",
      id_kategori: task.id_kategori ? task.id_kategori.toString() : "",
      deadline: formattedDate
    });
    setIsDetailModalOpen(false);
    setIsModalOpen(true);
    setOpenMenuTaskId(null);
  };

  // --- HANDLER UNTUK MARK TASK AS DONE ---
  const handleMarkAsDone = async (task: any) => {
    // Cari lokasi task saat ini
    let sourceColumnId = "TODO";
    for (const colId of data.columnOrder) {
      if (data.columns[colId].taskIds.includes(task.id)) {
        sourceColumnId = colId;
        break;
      }
    }

    if (sourceColumnId === "DONE") {
      setIsDetailModalOpen(false);
      return; // Sudah selesai
    }

    // Optimistic UI Update
    const startColumn = data.columns[sourceColumnId];
    const finishColumn = data.columns["DONE"];

    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(startTaskIds.indexOf(task.id), 1);
    const finishTaskIds = Array.from(finishColumn.taskIds);
    finishTaskIds.push(task.id); // Taruh di akhir kolom DONE

    setData({
      ...data,
      columns: {
        ...data.columns,
        [startColumn.id]: { ...startColumn, taskIds: startTaskIds },
        [finishColumn.id]: { ...finishColumn, taskIds: finishTaskIds },
      },
    });

    setIsDetailModalOpen(false);

    // Update ke Database
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_task: task.dbId, status: "DONE" }),
      });
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  // --- LOGIKA DRAG AND DROP (UPDATE STATUS) ---
  const onDragEnd = async (result: DropResult) => {
    if (projectRole !== "admin") return; // Members cannot drag and drop
    
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const startColumn = data.columns[source.droppableId];
    const finishColumn = data.columns[destination.droppableId];

    // Optimistic UI Update
    const startTaskIds = Array.from(startColumn.taskIds);
    const realSourceIndex = startTaskIds.indexOf(draggableId);
    if (realSourceIndex !== -1) {
      startTaskIds.splice(realSourceIndex, 1);
    }
    const finishTaskIds = source.droppableId === destination.droppableId ? startTaskIds : Array.from(finishColumn.taskIds);
    if (source.droppableId !== destination.droppableId) {
      finishTaskIds.splice(destination.index, 0, draggableId);
    } else {
      startTaskIds.splice(destination.index, 0, draggableId);
    }

    setData({
      ...data,
      columns: {
        ...data.columns,
        [startColumn.id]: { ...startColumn, taskIds: startTaskIds },
        [finishColumn.id]: { ...finishColumn, taskIds: finishTaskIds },
      },
    });

    // Update ke Database
    if (source.droppableId !== destination.droppableId) {
      await fetch('/api/tasks', {
        method: 'PUT',
        body: JSON.stringify({ id_task: data.tasks[draggableId].dbId, status: destination.droppableId }),
      });
    }
  };

  // --- LOGIKA HAPUS TUGAS (DELETE) ---
  const handleDeleteTask = async (taskId: string, dbId: number) => {
    setModalState({
      isOpen: true,
      title: "Delete Task",
      message: "Are you sure you want to delete this task?",
      type: "confirm",
      variant: "danger",
      onConfirm: async () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch('/api/tasks', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_task: dbId }),
          });

          if (!res.ok) throw new Error("Failed to delete task");

          const newData = { ...data };
          for (const colId of newData.columnOrder) {
            newData.columns[colId].taskIds = newData.columns[colId].taskIds.filter(id => id !== taskId);
          }
          delete newData.tasks[taskId];
          setData(newData);
        } catch (error) {
          console.error("An error occurred:", error);
          setModalState({ isOpen: true, message: "Failed to delete task.", type: "alert", variant: "danger", onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
        }
      },
      onCancel: () => setModalState(prev => ({ ...prev, isOpen: false }))
    });
  };


  // --- LOGIKA TAMBAH/EDIT TUGAS (CREATE/UPDATE) ---
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTask) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask.dbId,
          isi_komentar: newComment,
        }),
      });

      if (res.ok) {
        const createdComment = await res.json();
        setComments([...comments, createdComment]);
        setNewComment("");
      } else {
        const errorData = await res.json();
        setModalState({ isOpen: true, message: `Failed to send comment: ${errorData.error}`, type: "alert", variant: "danger", onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
      }
    } catch (error) {
      console.error("Failed to send comment:", error);
      setModalState({ isOpen: true, message: "An error occurred while sending comment.", type: "alert", variant: "danger", onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    setModalState({
      isOpen: true,
      title: "Delete Comment",
      message: "Are you sure you want to delete this comment?",
      type: "confirm",
      variant: "danger",
      onConfirm: async () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/comments?id=${commentId}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            setComments(comments.filter(c => c.id_komentar !== commentId));
          } else {
            setModalState({ isOpen: true, message: "Failed to delete comment", type: "alert", variant: "danger", onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
          }
        } catch (error) {
          console.error("Failed to delete comment:", error);
        }
      },
      onCancel: () => setModalState(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleUpdateComment = async (commentId: number) => {
    if (!editCommentText.trim()) return;

    try {
      const res = await fetch('/api/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_komentar: commentId,
          isi_komentar: editCommentText,
        }),
      });

      if (res.ok) {
        const updatedComment = await res.json();
        setComments(comments.map(c => c.id_komentar === commentId ? updatedComment : c));
        setEditingCommentId(null);
        setEditCommentText("");
      } else {
        setModalState({ isOpen: true, message: "Failed to update comment", type: "alert", variant: "danger", onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
      }
    } catch (error) {
      console.error("Failed to update comment:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let response;
      let responseData;

      if (editingTask) {
        // UPDATE: Gunakan PATCH untuk edit task
        response = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_task: editingTask.dbId,
            ...formData
          }),
        });
        responseData = await response.json();

        // Cari nama user berdasarkan id_user
        const selectedUser = users.find(u => u.id_user.toString() === formData.id_user);

        // Update task di state
        const taskId = editingTask.id;
        setData({
          ...data,
          tasks: {
            ...data.tasks,
            [taskId]: {
              id: taskId,
              dbId: responseData.id_task,
              judul_task: responseData.judul_task,
              content: responseData.deskripsi,
              kategori: responseData.kategori.nama_kategori,
              warnaKategori: responseData.kategori.kode_warna,
              id_user: responseData.id_user,
              id_kategori: responseData.id_kategori,
              deadline: responseData.deadline,
              nama_user: selectedUser?.nama_lengkap || "Unknown"
            }
          }
        });
      } else {
        // CREATE: Gunakan POST untuk task baru
        const postData = projectId ? { ...formData, id_project: projectId } : formData;
        response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData),
        });
        responseData = await response.json();

        // Cari nama user berdasarkan id_user
        const selectedUser = users.find(u => u.id_user.toString() === formData.id_user);

        const taskId = `task-${responseData.id_task}`;

        setData({
          ...data,
          tasks: {
            ...data.tasks,
            [taskId]: {
              id: taskId,
              dbId: responseData.id_task,
              judul_task: responseData.judul_task,
              content: responseData.deskripsi,
              kategori: responseData.kategori.nama_kategori,
              warnaKategori: responseData.kategori.kode_warna,
              id_user: responseData.id_user,
              id_kategori: responseData.id_kategori,
              deadline: responseData.deadline,
              nama_user: selectedUser?.nama_lengkap || "Unknown"
            }
          },
          columns: {
            ...data.columns,
            "TODO": { ...data.columns["TODO"], taskIds: [...data.columns["TODO"].taskIds, taskId] }
          }
        });
      }

      // Reset form dan tutup modal
      setFormData({ judul_task: "", deskripsi: "", id_user: "", id_kategori: "", deadline: "" });
      setEditingTask(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error("An error occurred:", error);
      setModalState({ isOpen: true, message: "Failed to save task. Try again!", type: "alert", variant: "danger", onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
    }
  };

  if (isLoading) return <div className="p-8 text-center text-black flex items-center justify-center min-h-screen">Loading data...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      {/* Navbar */}
      <div className="w-full h-16 sm:h-20 bg-white shadow-sm border-b border-slate-200 px-8 flex justify-between items-center flex-shrink-0 z-50 relative">
        {/* Logo */}
        <div className="flex items-center gap-2 mt-2">
          {/* Logo icon */}
          <div className="relative w-9 h-9 flex-shrink-0">
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
          {/* Text */}
          <div className="flex flex-col">
            <div className="flex items-center">
              <span className="text-blue-500 text-xl font-bold font-['Inter'] leading-8">Four</span>
              <span className="text-blue-300 text-xl font-bold font-['Inter'] leading-8">Ban</span>
            </div>
            <div className="text-blue-200 text-[8px] font-medium font-['Inter'] leading-[8px] tracking-[0.08em] mt-[-4px]">
              ORGANIZE • FLOW • DELIVER
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 relative cursor-pointer" onClick={() => setIsProfileOpen(!isProfileOpen)}>
          <div className="hidden sm:flex text-right flex-col justify-center">
            <div className="text-gray-900 text-base font-semibold font-['Inter'] leading-6">{session?.user?.name || "User"}</div>
            <div className="text-gray-500 text-xs font-medium font-['Inter'] leading-4">{session?.user?.email || "user@email.com"}</div>
          </div>
          <div className="w-11 h-11 bg-gradient-to-br from-indigo-300 to-blue-900 rounded-full shadow-md flex justify-center items-center">
            <span className="text-white text-lg font-semibold font-['Inter']">{session?.user?.name ? session.user.name[0].toUpperCase() : "U"}</span>
          </div>

          {/* Profil Dropdown */}
          {isProfileOpen && (
            <div className="absolute top-14 right-0 w-56 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
               {/* Header Menu */}
               <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-0.5">
                 <div className="text-gray-900 text-sm font-bold truncate">{session?.user?.name || "User"}</div>
                 <div className="text-gray-500 text-xs font-medium truncate">{session?.user?.email || "user@email.com"}</div>
               </div>

               {/* Profile Menu */}
               <button
                  onClick={() => { setIsViewProfileModalOpen(true); setIsProfileOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
               >
                 <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                 Profile
               </button>

               {/* Project Management (PM of this project only) */}
               {projectId && projectRole === "admin" ? (
                 <button
                    onClick={() => { window.location.href = `/admin?projectId=${projectId}`; setIsProfileOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
                 >
                   <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                   Project Management
                 </button>
               ) : null}

               {/* Log Out */}
               <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full text-left px-4 py-3 text-sm text-red-500 font-medium hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-gray-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                  Sign Out
               </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-6 pb-12 gap-6 max-w-[1200px] w-full mx-auto overflow-x-hidden">
        {/* Back Button */}
        <div>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="flex items-center gap-2 text-slate-500 hover:text-[#0E2F76] font-medium transition-colors text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Back to Dashboard
          </button>
        </div>

        {/* Banner */}
        <div className="w-full sm:h-44 bg-gradient-to-br from-[#F5FEFF] to-[#AAC0E1] rounded-2xl shadow-sm border border-blue-100 p-8 flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-0 relative overflow-hidden">
          <div className="flex flex-col gap-2 relative z-10 w-full sm:w-2/3">
            <h1 className="text-blue-900 text-[28px] sm:text-4xl font-bold font-['Inter'] leading-10">
              {projectTitle ? projectTitle : `Welcome, ${session?.user?.name?.split(' ')[0] || "User"}!`}
            </h1>
            <p className="text-slate-600 text-base sm:text-lg font-normal font-['Inter'] leading-7">
              {projectDesc ? projectDesc : "Let's manage and complete your tasks today more productively"}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-md border border-blue-200 w-28 h-28 flex flex-col justify-center items-center relative z-10 flex-shrink-0">
            <div className="text-gray-500 text-sm font-normal font-['Inter'] leading-5 mb-1">Total Task</div>
            <div className="text-[#0E2F76] text-3xl font-bold font-['Inter'] leading-9">
              {Object.keys(data.tasks).length}
            </div>
          </div>
        </div>

        {/* Toolbar & Board Wrapper */}
        <div className="flex flex-col gap-4 w-full">
          {/* Toolbar Sortir */}
          <div className="flex justify-end items-center w-full">
            <div className="relative">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none border border-black/10 rounded-[10px] bg-white text-[13px] font-semibold font-['Inter'] px-4 py-2.5 pr-10 text-slate-700 outline-none hover:shadow-md transition-shadow cursor-pointer focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="default">Sort by: Default</option>
                <option value="A-Z">Alphabetical (A - Z)</option>
                <option value="Z-A">Alphabetical (Z - A)</option>
                <option value="Priority-Low">Priority (Low - High)</option>
                <option value="Priority-High">Priority (High - Low)</option>
                <option value="Deadline-Terdekat">Deadline (Nearest)</option>
                <option value="Deadline-Terjauh">Deadline (Furthest)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          {/* Board */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex flex-nowrap md:flex-wrap lg:flex-nowrap gap-6 w-full">
            {data.columnOrder.map((columnId) => {
              const column = data.columns[columnId];
              const tasks = column.taskIds.map((taskId) => data.tasks[taskId]);

              // Logika Sortir
              let sortedTasks = [...tasks];
              if (sortBy === "A-Z") {
                sortedTasks.sort((a, b) => (a.judul_task || "").localeCompare(b.judul_task || ""));
              } else if (sortBy === "Z-A") {
                sortedTasks.sort((a, b) => (b.judul_task || "").localeCompare(a.judul_task || ""));
              } else if (sortBy === "Priority-Low") {
                const p = { low: 1, medium: 2, high: 3 } as any;
                sortedTasks.sort((a, b) => (p[a.kategori?.toLowerCase()] || 0) - (p[b.kategori?.toLowerCase()] || 0));
              } else if (sortBy === "Priority-High") {
                const p = { low: 1, medium: 2, high: 3 } as any;
                sortedTasks.sort((a, b) => (p[b.kategori?.toLowerCase()] || 0) - (p[a.kategori?.toLowerCase()] || 0));
              } else if (sortBy === "Deadline-Terdekat") {
                sortedTasks.sort((a, b) => {
                  if (!a.deadline && !b.deadline) return 0;
                  if (!a.deadline) return 1;
                  if (!b.deadline) return -1;
                  return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                });
              } else if (sortBy === "Deadline-Terjauh") {
                sortedTasks.sort((a, b) => {
                  if (!a.deadline && !b.deadline) return 0;
                  if (!a.deadline) return 1;
                  if (!b.deadline) return -1;
                  return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
                });
              }

              let titleText = "";
              let countBgColor = "";
              let countTextColor = "";
              let plusIconColor = "";
              if (columnId === "TODO") {
                 titleText = "To Do";
                 countBgColor = "bg-red-100";
                 countTextColor = "text-black";
                 plusIconColor = "text-red-600";
              } else if (columnId === "DOING") {
                 titleText = "In Progress";
                 countBgColor = "bg-yellow-50";
                 countTextColor = "text-black";
                 plusIconColor = "text-orange-500";
              } else if (columnId === "DONE") {
                 titleText = "Done";
                 countBgColor = "bg-green-100";
                 countTextColor = "text-black";
                 plusIconColor = "text-green-700";
              }

              return (
                <div key={column.id} className="flex-1 min-w-[320px] bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4 p-5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h2 className="text-gray-900 text-lg font-medium font-['Inter'] leading-7">{titleText}</h2>
                      <div className={`w-6 h-6 ${countBgColor} rounded-full flex justify-center items-center`}>
                        <span className={`${countTextColor} text-sm font-normal font-['Inter'] leading-5`}>{tasks.length}</span>
                      </div>
                    </div>
                    
                    {projectRole === "admin" && (
                      <button 
                        className={`w-5 h-5 flex justify-center items-center ${plusIconColor} hover:scale-110 transition-transform`}
                        onClick={() => {
                          setEditingTask(null);
                          setFormData({ judul_task: "", deskripsi: "", id_user: "", id_kategori: "", deadline: "" });
                          setIsModalOpen(true);
                        }}
                        title="Add New Task"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.67" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path>
                        </svg>
                      </button>
                    )}
                  </div>

                  <Droppable droppableId={column.id}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 flex flex-col gap-3 min-h-[150px]">
                        {sortedTasks.map((task, index) => {
                          let dateColor = "text-gray-900"; // Hitam
                          let DateIcon = (
                            <svg className="w-3.5 h-3.5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          );

                          if (task.deadline) {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const deadlineDate = new Date(task.deadline);
                            deadlineDate.setHours(0, 0, 0, 0);

                            if (deadlineDate.getTime() === today.getTime()) {
                              dateColor = "text-orange-500";
                              DateIcon = (
                                <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              );
                            } else if (deadlineDate.getTime() < today.getTime()) {
                              dateColor = "text-red-600";
                              DateIcon = (
                                <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              );
                            }
                          }

                          return (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => handleTaskClick(task)}
                                  className="group w-full bg-white rounded-[10px] border border-black/10 flex flex-col p-3 gap-2 relative cursor-pointer hover:shadow-md transition-shadow"
                                >
                                  {/* Card Header */}
                                  <div className="flex justify-between items-start">
                                    <div className="text-neutral-950 text-[15px] font-semibold font-['Inter'] leading-5 pr-12 line-clamp-1">{task.judul_task || "No Title"}</div>
                                    
                                    {/* Action Icons (Edit & Delete) */}
                                    {projectRole === "admin" && (
                                      <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleEditFromMenu(task); }} 
                                          className="text-blue-600 hover:text-blue-800 bg-blue-50 p-1.5 rounded-sm"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                          </svg>
                                        </button>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id, task.dbId); }} 
                                          className="text-red-600 hover:text-red-800 bg-red-50 p-1.5 rounded-sm"
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Description */}
                                  <div className="text-gray-500 text-[13px] font-normal font-['Inter'] leading-4 line-clamp-2">
                                    {task.content || "No description"}
                                  </div>

                                  {/* Info Items */}
                                  <div className="flex flex-col gap-1.5 mt-0.5">
                                    {/* Assignee */}
                                    <div className="flex items-center gap-1.5 text-gray-500 text-[13px]">
                                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      <span className="line-clamp-1">{task.nama_user || "Unknown"}</span>
                                    </div>
                                    {/* Kategori */}
                                    <div className="flex items-center gap-1.5">
                                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                      </svg>
                                      <span className="px-1.5 py-0.5 rounded-sm text-[11px] font-medium font-['Inter']" style={{ backgroundColor: (task.warnaKategori || '#A855F7') + '22', color: '#000000' }}>
                                        {task.kategori || "General"}
                                      </span>
                                    </div>
                                    {/* Date */}
                                    <div className={`flex items-center gap-1.5 ${dateColor} text-[13px] font-medium`}>
                                      {DateIcon}
                                      <span>{formatDeadline(task.deadline)}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}

                        {/* Empty State */}
                        {tasks.length === 0 && (
                          <div className="w-full flex justify-center items-center py-6 text-gray-400 text-sm font-normal font-['Inter']">
                            No tasks yet
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
        </div>
      </div>

      {/* MODAL DETAIL TASK */}
      {isDetailModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-gradient-to-br from-[#F5FEFF] to-[#E2EAF4] w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
              {/* Header Modal */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#0E2F76]">{selectedTask.judul_task}</h2>
              </div>

              {/* Detail Informasi */}
              <div className="space-y-6">
                {/* Deskripsi */}
                <div>
                  <label className="block text-sm font-semibold text-[#0E2F76] mb-2">Description</label>
                  <p className="text-[#0E2F76]/80 text-base leading-relaxed bg-white/60 shadow-sm border border-white/50 p-4 rounded-xl min-h-24">
                    {selectedTask.content || "No description"}
                  </p>
                </div>

                {/* Grid Informasi */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* User */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0E2F76] uppercase mb-2">Assignee</label>
                    <div className="flex items-center gap-2 bg-white/60 shadow-sm border border-white/50 p-3 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-[#0E2F76] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {getInitials(selectedTask.nama_user || "U")}
                      </div>
                      <span className="text-sm font-medium text-[#0E2F76]">{selectedTask.nama_user || "Unknown"}</span>
                    </div>
                  </div>

                  {/* Kategori */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0E2F76] uppercase mb-2">Category</label>
                    <div className="bg-white/60 shadow-sm border border-white/50 p-3 rounded-xl flex items-center">
                      <div className="h-[32px] flex items-center">
                        <span className="px-2 py-0.5 rounded-sm text-[11px] font-semibold font-['Inter'] uppercase" style={{ backgroundColor: (selectedTask.warnaKategori || '#A855F7') + '22', color: '#000000' }}>
                          {selectedTask.kategori || "General"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Deadline */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0E2F76] uppercase mb-2">Deadline</label>
                    <div className="bg-white/60 shadow-sm border border-white/50 p-3 rounded-xl flex items-center">
                      {(() => {
                        let dateColor = "text-gray-900"; // Hitam

                        if (selectedTask.deadline) {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const deadlineDate = new Date(selectedTask.deadline);
                          deadlineDate.setHours(0, 0, 0, 0);

                          if (deadlineDate.getTime() === today.getTime()) {
                            dateColor = "text-orange-500";
                          } else if (deadlineDate.getTime() < today.getTime()) {
                            dateColor = "text-red-600";
                          }
                        }

                        return (
                          <div className={`flex items-center ${dateColor} text-sm font-semibold font-['Inter'] w-full h-[32px]`}>
                            <span>{formatDeadline(selectedTask.deadline)}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Diskusi Tim */}
              <div className="mt-8 pt-2">
                <h3 className="text-lg font-bold text-[#0E2F76] mb-4">Team Discussion</h3>

                {/* Daftar Komentar */}
                <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {isLoadingComments ? (
                    <p className="text-center text-sm text-[#0E2F76]/60">Loading comments...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-center text-sm text-[#0E2F76]/60">No discussions for this task yet.</p>
                  ) : (
                    comments.map((comment: any) => (
                      <div key={comment.id_komentar} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-white text-[#0E2F76] text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-sm" title={comment.user.nama_lengkap}>
                          {getInitials(comment.user.nama_lengkap || "U")}
                        </div>
                        <div className="bg-white/70 p-3 rounded-xl rounded-tl-none flex-1 border border-white/50 shadow-sm">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[#0E2F76]">{comment.user.nama_lengkap}</span>
                              <span className="text-[10px] text-[#0E2F76]/60">
                                {new Date(comment.created_at).toLocaleString('id-ID', {
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>

                            {/* Aksi Edit/Delete jika pemilik komentar */}
                            {session?.user && (session.user as any).id && parseInt((session.user as any).id) === comment.id_user && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingCommentId(comment.id_komentar);
                                    setEditCommentText(comment.isi_komentar);
                                  }}
                                  className="text-[#0E2F76]/40 hover:text-[#0E2F76] transition-colors"
                                  title="Edit Comment"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment.id_komentar)}
                                  className="text-[#0E2F76]/40 hover:text-red-500 transition-colors"
                                  title="Delete Comment"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                              </div>
                            )}
                          </div>

                          {editingCommentId === comment.id_komentar ? (
                            <div className="mt-2 flex gap-2">
                              <input
                                type="text"
                                value={editCommentText}
                                onChange={(e) => setEditCommentText(e.target.value)}
                                className="flex-1 border border-indigo-200 p-1.5 rounded-lg text-sm focus:ring-1 focus:ring-[#0E2F76] outline-none"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateComment(comment.id_komentar);
                                  else if (e.key === 'Escape') setEditingCommentId(null);
                                }}
                              />
                              <button
                                onClick={() => handleUpdateComment(comment.id_komentar)}
                                className="px-2 py-1 bg-[#0E2F76] text-white text-xs font-medium rounded-md hover:bg-blue-900"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingCommentId(null)}
                                className="px-2 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm text-[#0E2F76]/90 whitespace-pre-wrap">{comment.isi_komentar}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Form Input Komentar */}
                <form onSubmit={handleSubmitComment} className="flex gap-3">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 border border-indigo-100 bg-white/80 shadow-sm p-3 rounded-xl text-sm focus:ring-2 focus:ring-[#0E2F76] outline-none transition"
                    disabled={isSubmittingComment}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="px-5 py-3 bg-[#0E2F76] text-white font-medium text-sm rounded-xl hover:bg-blue-900 shadow-md transition disabled:bg-indigo-300 flex items-center justify-center min-w-[90px]"
                  >
                    {isSubmittingComment ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      "Send"
                    )}
                  </button>
                </form>
              </div>

              {/* Tombol Aksi */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-6 py-2.5 bg-white border border-slate-200 shadow-sm text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => handleMarkAsDone(selectedTask)}
                  className="px-6 py-2.5 bg-[#0E2F76] shadow-md text-white font-medium rounded-xl hover:bg-blue-900 transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Tambah & Edit Tugas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-gradient-to-br from-[#F5FEFF] to-[#E2EAF4] w-full max-w-3xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
              {/* Header Modal */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[#0E2F76]">
                  {editingTask ? editingTask.judul_task : "Add Task"}
                </h2>
                <p className="text-[#0E2F76]/60 text-sm mt-1">
                  {editingTask ? "Update the information below to modify the task" : "Fill in the form below to create a task"}
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
                      setFormData({ judul_task: "", deskripsi: "", id_user: "", id_kategori: "", deadline: "" });
                      setEditingTask(null);
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
                    {editingTask ? "Save" : "Add Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Profile Detail Modal */}
      {isViewProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header & Avatar */}
            <div className="bg-gradient-to-br from-[#F5FEFF] to-[#AAC0E1] p-6 pb-8 relative flex flex-col items-center">
              <button 
                onClick={() => setIsViewProfileModalOpen(false)}
                className="absolute top-4 right-4 text-blue-900/60 hover:text-blue-900 bg-white/30 hover:bg-white/50 p-1.5 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
              
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-300 to-blue-900 rounded-full shadow-lg flex justify-center items-center border-4 border-white mb-3">
                <span className="text-white text-3xl font-bold font-['Inter']">
                  {session?.user?.name ? session.user.name[0].toUpperCase() : "U"}
                </span>
              </div>
              <h2 className="text-blue-950 text-xl font-bold font-['Inter'] text-center">
                {session?.user?.name || "Unknown User"}
              </h2>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
              
              {/* User Details */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Username</div>
                    <div className="text-sm text-slate-900 font-semibold">
                      {users.find(u => u.email === session?.user?.email)?.username || "-"}
                    </div>
                  </div>
                </div>
                <div className="h-px bg-slate-200"></div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs text-slate-500 font-medium">Email</div>
                    <div className="text-sm text-slate-900 font-semibold truncate">
                      {session?.user?.email || "-"}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tugas Saya */}
              <div className="flex flex-col gap-3">
                <h3 className="text-slate-800 font-bold font-['Inter'] flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                  My Tasks
                </h3>
                
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {Object.values(data.tasks).filter((t: any) => t.nama_user === session?.user?.name).length > 0 ? (
                      Object.values(data.tasks)
                        .filter((t: any) => t.nama_user === session?.user?.name)
                        .map((task: any) => (
                          <li key={task.id} className="p-3 hover:bg-slate-50 transition-colors flex items-start gap-3">
                            <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${data.columns["TODO"].taskIds.includes(task.id) ? "bg-red-500" : data.columns["DOING"].taskIds.includes(task.id) ? "bg-orange-400" : "bg-green-500"}`}></div>
                            <div className="flex flex-col flex-1">
                              <span className="text-sm text-slate-800 font-semibold line-clamp-1">{task.judul_task}</span>
                              <span className="text-xs text-slate-500">{task.kategori} • {formatDeadline(task.deadline)}</span>
                            </div>
                          </li>
                        ))
                    ) : (
                      <li className="p-4 text-center text-sm text-slate-500 italic">
                        No tasks assigned.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
              
            </div>
            
            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsViewProfileModalOpen(false)}
                className="px-5 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              >
                Close
              </button>
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

