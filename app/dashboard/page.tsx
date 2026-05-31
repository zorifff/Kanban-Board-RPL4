"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from "next-auth/react";
import CustomModal from "@/app/components/CustomModal";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("projects"); // "projects" or "invitations"
  const [sortBy, setSortBy] = useState("default");
  
  const [projects, setProjects] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectData, setNewProjectData] = useState({ nama_project: "", deskripsi: "", deadline: "" });
  
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editProjectData, setEditProjectData] = useState({ id_project: 0, nama_project: "", deskripsi: "", deadline: "" });
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ id_project: '', email_invitee: '' });

  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedProjectMembers, setSelectedProjectMembers] = useState<{ id_project: number, myRole: string, nama_project: string, members: any[] } | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

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
    fetchProjects();
    fetchInvitations();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) setProjects(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchInvitations = async () => {
    try {
      const res = await fetch('/api/invitations');
      if (res.ok) setInvitations(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProjectData)
      });
      if (res.ok) {
        setIsNewProjectModalOpen(false);
        setNewProjectData({ nama_project: '', deskripsi: '', deadline: '' });
        fetchProjects();
      } else {
        setModalState({ isOpen: true, message: "Gagal membuat project", type: "alert", variant: "danger", onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
      }
    } catch (e) { console.error(e); }
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editProjectData)
      });
      if (res.ok) {
        setIsEditProjectModalOpen(false);
        fetchProjects();
      } else {
        const err = await res.json();
        setModalState({ isOpen: true, message: err.error || "Failed to update project", type: "alert", variant: "danger", onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
      }
    } catch (e) { console.error(e); }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData)
      });
      if (res.ok) {
        setIsInviteModalOpen(false);
        setInviteData({ id_project: '', email_invitee: '' });
        setModalState({ isOpen: true, title: "Berhasil", message: "Undangan berhasil dikirim", type: "alert", variant: "success", onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
      } else {
        const error = await res.json();
        setModalState({ isOpen: true, message: error.error || "Gagal mengundang user", type: "alert", variant: "danger", onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
      }
    } catch (e) { console.error(e); }
  };

  const handleInvitationAction = async (id_invitation: number, action: 'accept' | 'reject') => {
    try {
      const res = await fetch('/api/invitations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_invitation, action })
      });
      if (res.ok) {
        fetchInvitations();
        if (action === 'accept') fetchProjects();
      }
    } catch (e) { console.error(e); }
  };

  const handleOpenMembers = async (id_project: number, myRole: string, nama_project: string) => {
    setIsMembersModalOpen(true);
    setIsLoadingMembers(true);
    try {
      const res = await fetch(`/api/projects/${id_project}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedProjectMembers({
          id_project,
          myRole,
          nama_project,
          members: data.members
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleRemoveMember = async (id_user: number) => {
    if (!selectedProjectMembers) return;
    setModalState({
      isOpen: true,
      title: "Remove Member",
      message: "Are you sure you want to remove this member from the project?",
      type: "confirm",
      variant: "danger",
      onConfirm: async () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/projects/${selectedProjectMembers.id_project}/members?userId=${id_user}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            setSelectedProjectMembers(prev => prev ? {
              ...prev,
              members: prev.members.filter(m => m.user.id_user !== id_user)
            } : null);
            fetchProjects();
          } else {
            const err = await res.json();
            setModalState({ isOpen: true, message: err.error || "Failed to remove member", type: "alert", variant: "danger", onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
          }
        } catch (e) { console.error(e); }
      },
      onCancel: () => setModalState(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handlePromoteMember = async (id_user: number, email: string) => {
    if (!selectedProjectMembers) return;
    setModalState({
      isOpen: true,
      title: "Make Project Manager",
      message: "Are you sure you want to assign the Project Manager role to this member? You will become a regular member if the invitation is accepted.",
      type: "confirm",
      variant: "warning",
      onConfirm: async () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch('/api/invitations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id_project: selectedProjectMembers.id_project,
              email_invitee: email,
              type: "role_change"
            })
          });
          if (res.ok) {
            setModalState({ isOpen: true, title: "Success", message: "Role change invitation sent successfully", type: "alert", variant: "success", onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
          } else {
            const error = await res.json();
            setModalState({ isOpen: true, message: error.error || "Failed to send invitation", type: "alert", variant: "danger", onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })) });
          }
        } catch (e) { console.error(e); }
      },
      onCancel: () => setModalState(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleLeaveProject = async (id_project: number) => {
    setModalState({
      isOpen: true,
      title: "Leave Project",
      message: "Are you sure you want to leave this project? You will lose access to it.",
      type: "confirm",
      variant: "danger",
      onConfirm: async () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch('/api/projects', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_project })
          });
          if (res.ok) {
            setModalState({
              isOpen: true,
              title: "Berhasil",
              message: "Berhasil keluar dari proyek",
              type: "alert",
              variant: "success",
              onConfirm: () => { setModalState(prev => ({ ...prev, isOpen: false })); fetchProjects(); }
            });
          } else {
            const err = await res.json();
            setModalState({
              isOpen: true,
              message: err.error || "Gagal keluar dari proyek",
              type: "alert",
              variant: "danger",
              onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false }))
            });
          }
        } catch (e) { console.error(e); }
      },
      onCancel: () => setModalState(prev => ({ ...prev, isOpen: false }))
    });
  };

  const sortedProjects = [...projects].sort((a, b) => {
    if (sortBy === "A-Z") return a.nama_project.localeCompare(b.nama_project);
    if (sortBy === "Z-A") return b.nama_project.localeCompare(a.nama_project);
    if (sortBy === "Terlama") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sortBy === "Deadline Terdekat") {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    if (sortBy === "Deadline Terjauh") {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
    }
    // Default: Terbaru (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#F5FEFF] to-[#E2EAF4] text-slate-800 font-sans">
      {/* Navbar */}
      <div className="w-full h-16 sm:h-20 bg-white shadow-sm border-b border-slate-200 px-8 flex justify-between items-center flex-shrink-0 z-50 relative">
        <div className="flex items-center gap-2 mt-2 cursor-pointer" onClick={() => router.push('/')}>
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

        <div className="flex items-center gap-3 relative cursor-pointer" onClick={() => setIsProfileOpen(!isProfileOpen)}>
          <div className="hidden sm:flex text-right flex-col justify-center">
            <div className="text-gray-900 text-base font-semibold font-['Inter'] leading-6">{session?.user?.name || "User"}</div>
            <div className="text-gray-500 text-xs font-medium font-['Inter'] leading-4">{session?.user?.email || "user@email.com"}</div>
          </div>
          <div className="w-11 h-11 bg-gradient-to-br from-indigo-300 to-blue-900 rounded-full shadow-md flex justify-center items-center">
            <span className="text-white text-lg font-semibold font-['Inter']">{session?.user?.name?.[0]?.toUpperCase() || "U"}</span>
          </div>

          {isProfileOpen && (
            <div className="absolute top-14 right-0 w-56 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
               <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-0.5">
                 <div className="text-gray-900 text-sm font-bold truncate">{session?.user?.name || "User"}</div>
                 <div className="text-gray-500 text-xs font-medium truncate">{session?.user?.email || "user@email.com"}</div>
               </div>
               <button onClick={() => signOut({ callbackUrl: "/login" })} className="w-full text-left px-4 py-3 text-sm text-red-500 font-medium hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-gray-100">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                  Sign Out
               </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <nav className="flex-1 px-4 py-6 space-y-1.5">
            <button 
              onClick={() => setActiveTab("projects")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors ${activeTab === "projects" ? "bg-blue-50/70 text-[#0E2F76]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
              </svg>
              Projects
            </button>
            <button 
              onClick={() => setActiveTab("invitations")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors ${activeTab === "invitations" ? "bg-blue-50/70 text-[#0E2F76]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Invitations / People
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {activeTab === "projects" && (
            <>
              <header className="h-20 flex items-center justify-between px-8 md:px-12">
                <h1 className="text-2xl font-bold text-slate-900">Your Projects</h1>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
                    <span className="text-sm font-medium text-slate-500 mr-2">Sort by:</span>
                    <select 
                      value={sortBy} 
                      onChange={(e) => setSortBy(e.target.value)}
                      className="text-sm font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
                    >
                      <option value="default">Newest</option>
                      <option value="Terlama">Oldest</option>
                      <option value="A-Z">Name (A-Z)</option>
                      <option value="Z-A">Name (Z-A)</option>
                      <option value="Deadline Terdekat">Nearest Deadline</option>
                      <option value="Deadline Terjauh">Furthest Deadline</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => setIsNewProjectModalOpen(true)}
                    className="flex items-center gap-2 bg-[#0E2F76] hover:bg-[#0b2359] text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"/><path d="M12 5v14"/>
                    </svg>
                    New Project
                  </button>
                </div>
              </header>

              <div className="px-8 md:px-12 pb-12 space-y-8 max-w-6xl">
                <div className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-medium">
                        <tr>
                          <th className="px-6 py-4 w-1/3">Project Name</th>
                          <th className="px-6 py-4">My Role</th>
                          <th className="px-6 py-4">Members</th>
                          <th className="px-6 py-4">Deadline</th>
                          <th className="px-6 py-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedProjects.length === 0 ? (
                          <tr><td colSpan={5} className="text-center py-6 text-slate-500">No projects yet.</td></tr>
                        ) : (
                          sortedProjects.map((project, i) => {
                            const myRole = project.members.find((m: any) => m.id_user === Number((session?.user as any)?.id))?.role || "member";
                            const colorClass = i % 2 === 0 ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700";
                            const roleClass = myRole === "admin" ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-slate-100 text-slate-700 border-slate-200";
                            
                            return (
                              <tr key={project.id_project} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => router.push(`/board/${project.id_project}`)}>
                                <td className="px-6 py-4 font-medium text-slate-900">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base ${colorClass} shrink-0`}>
                                      {project.nama_project[0].toUpperCase()}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="line-clamp-1">{project.nama_project}</span>
                                      {project.deskripsi && <span className="text-xs text-slate-500 font-normal line-clamp-1">{project.deskripsi}</span>}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${roleClass}`}>
                                    {myRole === "admin" ? "Project Manager" : "Member"}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="cursor-pointer hover:bg-blue-100 p-1.5 -ml-1.5 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenMembers(project.id_project, myRole, project.nama_project);
                                      }}
                                      title="View Members"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                      </svg>
                                    </div>
                                    <span className="text-sm text-slate-600 font-medium">{project._count?.members || 1} Members</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                  {project.deadline ? new Date(project.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : <span className="text-slate-400 italic">TBA</span>}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    {myRole === "admin" && (
                                      <button onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setEditProjectData({
                                          id_project: project.id_project,
                                          nama_project: project.nama_project,
                                          deskripsi: project.deskripsi || "",
                                          deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : ""
                                        });
                                        setIsEditProjectModalOpen(true);
                                      }} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Edit Project">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                          <path d="m15 5 4 4"/>
                                        </svg>
                                      </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); handleLeaveProject(project.id_project); }} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Leave Project">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <section className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900 px-1">Pending Invitations</h2>
                  {invitations.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center text-slate-500">No pending invitations</div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-200 overflow-hidden">
                      {invitations.map(invite => (
                        <div key={invite.id_invitation} className="flex items-center justify-between p-5 hover:bg-slate-50/80 transition-colors border-b last:border-b-0 border-slate-100">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm text-slate-600 leading-relaxed">
                                {invite.type === 'role_change' ? (
                                  <>
                                    You are invited to be a <span className="font-semibold text-slate-900">Project Manager</span> in project <span className="font-semibold text-slate-900">{invite.project.nama_project}</span> by <span className="font-medium text-slate-800">{invite.inviter.nama_lengkap}</span>
                                  </>
                                ) : (
                                  <>
                                    You are invited to project <span className="font-semibold text-slate-900">{invite.project.nama_project}</span> by <span className="font-medium text-slate-800">{invite.inviter.nama_lengkap}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            <button onClick={() => handleInvitationAction(invite.id_invitation, 'reject')} className="text-sm font-medium text-red-600 bg-white hover:bg-red-50 border border-red-200 px-4 py-2 rounded-lg transition-colors">
                              Decline
                            </button>
                            <button onClick={() => handleInvitationAction(invite.id_invitation, 'accept')} className="text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 px-4 py-2 rounded-lg shadow-sm transition-colors">
                              Accept
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}

          {activeTab === "invitations" && (
            <div className="p-8 md:p-12 space-y-8 max-w-4xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Member Management</h1>
                  <p className="text-slate-500 text-sm mt-1">Invite others to join your project</p>
                </div>
                <button 
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-2 bg-[#0E2F76] hover:bg-[#0b2359] text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                  </svg>
                  Invite User
                </button>
              </div>

              {/* Tampilkan daftar anggota proyek - placeholder untuk pengembangan lebih lanjut */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
                Select a project to view its member list. You can manage members on the project details page later.
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal New Project */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-[#F5FEFF] to-[#E2EAF4] w-full max-w-lg rounded-2xl shadow-2xl p-8 border border-white/50">
            <h2 className="text-2xl font-bold text-[#0E2F76] mb-1">Create New Project</h2>
            <p className="text-[#0E2F76]/70 text-sm mb-6">Fill in project details to start collaborating.</p>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#0E2F76] mb-2">Project Name</label>
                <input required type="text" value={newProjectData.nama_project} onChange={(e) => setNewProjectData({...newProjectData, nama_project: e.target.value})} className="w-full border border-indigo-100 bg-white/80 shadow-sm p-3 rounded-xl focus:ring-2 focus:ring-[#0E2F76] outline-none transition" placeholder="Example: Website Redesign" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0E2F76] mb-2">Short Description</label>
                <textarea required value={newProjectData.deskripsi} onChange={(e) => setNewProjectData({...newProjectData, deskripsi: e.target.value})} className="w-full border border-indigo-100 bg-white/80 shadow-sm p-3 rounded-xl focus:ring-2 focus:ring-[#0E2F76] outline-none transition resize-none h-24" placeholder="Briefly describe this project..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0E2F76] mb-2">Deadline (Optional)</label>
                <input type="date" value={newProjectData.deadline} onChange={(e) => setNewProjectData({...newProjectData, deadline: e.target.value})} className="w-full border border-indigo-100 bg-white/80 shadow-sm p-3 rounded-xl focus:ring-2 focus:ring-[#0E2F76] outline-none transition" />
              </div>
              
              <div className="flex justify-end gap-3 mt-8 pt-4">
                <button type="button" onClick={() => setIsNewProjectModalOpen(false)} className="px-6 py-2.5 bg-white border border-slate-200 shadow-sm text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-[#0E2F76] shadow-md text-white font-medium rounded-xl hover:bg-blue-900 transition">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Invite User */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-[#F5FEFF] to-[#E2EAF4] w-full max-w-lg rounded-2xl shadow-2xl p-8 border border-white/50">
            <h2 className="text-2xl font-bold text-[#0E2F76] mb-1">Invite to Project</h2>
            <p className="text-[#0E2F76]/70 text-sm mb-6">Invite coworkers using their email address.</p>
            
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#0E2F76] mb-2">Select Project</label>
                <select required value={inviteData.id_project} onChange={(e) => setInviteData({...inviteData, id_project: e.target.value})} className="w-full border border-indigo-100 bg-white/80 shadow-sm p-3 rounded-xl focus:ring-2 focus:ring-[#0E2F76] outline-none transition">
                  <option value="">Select project (admin only)...</option>
                  {projects.filter((p: any) => p.members.some((m:any) => m.id_user === Number((session?.user as any)?.id) && m.role === "admin")).map(p => (
                    <option key={p.id_project} value={p.id_project}>{p.nama_project}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0E2F76] mb-2">User Email</label>
                <input required type="email" value={inviteData.email_invitee} onChange={(e) => setInviteData({...inviteData, email_invitee: e.target.value})} className="w-full border border-indigo-100 bg-white/80 shadow-sm p-3 rounded-xl focus:ring-2 focus:ring-[#0E2F76] outline-none transition" placeholder="Example: buddy@gmail.com" />
              </div>
              
              <div className="flex justify-end gap-3 mt-8 pt-4">
                <button type="button" onClick={() => setIsInviteModalOpen(false)} className="px-6 py-2.5 bg-white border border-slate-200 shadow-sm text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-[#0E2F76] shadow-md text-white font-medium rounded-xl hover:bg-blue-900 transition">Send Invitation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Project */}
      {isEditProjectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-[#F5FEFF] to-[#E2EAF4] w-full max-w-lg rounded-2xl shadow-2xl p-8 border border-white/50">
            <h2 className="text-2xl font-bold text-[#0E2F76] mb-1">Edit Project</h2>
            <p className="text-[#0E2F76]/70 text-sm mb-6">Update project information.</p>
            
            <form onSubmit={handleEditProject} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#0E2F76] mb-2">Project Name</label>
                <input required type="text" value={editProjectData.nama_project} onChange={(e) => setEditProjectData({...editProjectData, nama_project: e.target.value})} className="w-full border border-indigo-100 bg-white/80 shadow-sm p-3 rounded-xl focus:ring-2 focus:ring-[#0E2F76] outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0E2F76] mb-2">Short Description</label>
                <textarea required value={editProjectData.deskripsi} onChange={(e) => setEditProjectData({...editProjectData, deskripsi: e.target.value})} className="w-full border border-indigo-100 bg-white/80 shadow-sm p-3 rounded-xl focus:ring-2 focus:ring-[#0E2F76] outline-none transition resize-none h-24"></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0E2F76] mb-2">Deadline (Optional)</label>
                <input type="date" value={editProjectData.deadline} onChange={(e) => setEditProjectData({...editProjectData, deadline: e.target.value})} className="w-full border border-indigo-100 bg-white/80 shadow-sm p-3 rounded-xl focus:ring-2 focus:ring-[#0E2F76] outline-none transition" />
              </div>
              
              <div className="flex justify-end gap-3 mt-8 pt-4">
                <button type="button" onClick={() => setIsEditProjectModalOpen(false)} className="px-6 py-2.5 bg-white border border-slate-200 shadow-sm text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-[#0E2F76] shadow-md text-white font-medium rounded-xl hover:bg-blue-900 transition">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {isMembersModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease-out]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMembersModalOpen(false)} />
          <div className="relative bg-gradient-to-br from-[#F5FEFF] to-[#E2EAF4] rounded-2xl shadow-2xl w-full max-w-[500px] overflow-hidden animate-[scaleIn_0.2s_ease-out] border border-white/50 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-white/40 shrink-0">
              <h2 className="text-2xl font-bold text-[#0E2F76] font-['Inter']">Project Members</h2>
              <p className="text-sm text-[#0E2F76]/60 mt-1">{selectedProjectMembers?.nama_project}</p>
            </div>
            
            <div className="p-6 overflow-y-auto overflow-x-hidden flex-1" style={{ scrollbarWidth: 'thin' }}>
              {isLoadingMembers ? (
                <div className="py-8 text-center text-slate-500">Loading members...</div>
              ) : selectedProjectMembers?.members ? (
                <div className="space-y-4">
                  {selectedProjectMembers.members.map((m: any) => (
                    <div key={m.id_user} className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-white/50 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-300 to-blue-900 rounded-full flex items-center justify-center text-white font-semibold shadow-sm shrink-0">
                          {m.user.nama_lengkap.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">{m.user.nama_lengkap}</p>
                          <p className="text-xs text-slate-500 truncate">{m.user.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${m.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {m.role === 'admin' ? 'Project Manager' : 'Member'}
                        </span>
                        
                        {/* Tampilkan aksi jika user saat ini adalah PM, dan yang dirender bukan dirinya sendiri */}
                        {selectedProjectMembers.myRole === 'admin' && m.id_user !== Number((session?.user as any)?.id) && m.role === 'member' && (
                          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                            <button 
                              onClick={() => handlePromoteMember(m.user.id_user, m.user.email)}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                              title="Make Project Manager"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                            </button>
                            <button 
                              onClick={() => handleRemoveMember(m.user.id_user)}
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                              title="Remove"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            
            <div className="p-6 pt-2 shrink-0">
              <button 
                onClick={() => setIsMembersModalOpen(false)}
                className="w-full bg-white border border-slate-200 text-slate-700 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors shadow-sm"
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
