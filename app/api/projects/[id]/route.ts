import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const userId = Number((session.user as any).id);
    const projectId = Number(id);

    const project = await prisma.tb_projects.findUnique({
      where: { id_project: projectId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id_user: true,
                nama_lengkap: true,
                email: true,
                username: true
              }
            }
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const member = project.members.find((m: any) => m.id_user === userId);
    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      ...project,
      currentUserRole: member.role
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}
