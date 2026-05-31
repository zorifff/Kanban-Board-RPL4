import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inviterId = Number((session.user as any).id);
    const { id } = await context.params;
    const projectId = Number(id);
    const url = new URL(request.url);
    const userIdToRemove = Number(url.searchParams.get("userId"));

    if (!userIdToRemove) {
        return NextResponse.json({ error: "Missing userId to remove" }, { status: 400 });
    }

    // Check if inviter is admin of the project
    const projectMember = await prisma.tb_project_members.findUnique({
      where: {
        id_project_id_user: {
          id_project: projectId,
          id_user: inviterId
        }
      }
    });

    if (!projectMember || projectMember.role !== "admin") {
      return NextResponse.json({ error: "You must be a project admin to remove users" }, { status: 403 });
    }
    
    // Cannot remove yourself this way (there's leave project for that)
    if (inviterId === userIdToRemove) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    // Delete user from project
    await prisma.tb_project_members.delete({
      where: {
        id_project_id_user: {
          id_project: projectId,
          id_user: userIdToRemove
        }
      }
    });

    return NextResponse.json({ message: "Member removed successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
