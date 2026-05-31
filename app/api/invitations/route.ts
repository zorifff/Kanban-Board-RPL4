import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as any).id);

    // Get pending invitations for the user
    const invitations = await prisma.tb_invitations.findMany({
      where: {
        id_invitee: userId,
        status: "pending"
      },
      include: {
        project: true,
        inviter: {
          select: {
            nama_lengkap: true,
            email: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inviterId = Number((session.user as any).id);
    const body = await request.json();
    const { id_project, email_invitee, type = "project" } = body;

    // Check if inviter is admin of the project
    const projectMember = await prisma.tb_project_members.findUnique({
      where: {
        id_project_id_user: {
          id_project: Number(id_project),
          id_user: inviterId
        }
      }
    });

    if (!projectMember || projectMember.role !== "admin") {
      return NextResponse.json({ error: "You must be a project admin to invite users" }, { status: 403 });
    }

    // Find the invitee
    const invitee = await prisma.tb_users.findUnique({
      where: { email: email_invitee }
    });

    if (!invitee) {
      return NextResponse.json({ error: "User with this email not found" }, { status: 404 });
    }

    // Check if user is already a member
    const existingMember = await prisma.tb_project_members.findUnique({
      where: {
        id_project_id_user: {
          id_project: Number(id_project),
          id_user: invitee.id_user
        }
      }
    });

    if (type === "project" && existingMember) {
      return NextResponse.json({ error: "User is already a member of this project" }, { status: 400 });
    }

    if (type === "role_change" && (!existingMember || existingMember.role !== "member")) {
      return NextResponse.json({ error: "User is not a regular member of this project" }, { status: 400 });
    }

    // Check if invitation already exists
    const existingInvite = await prisma.tb_invitations.findFirst({
      where: {
        id_project: Number(id_project),
        id_invitee: invitee.id_user,
        status: "pending"
      }
    });

    if (existingInvite) {
      return NextResponse.json({ error: "An invitation is already pending for this user" }, { status: 400 });
    }

    const invitation = await prisma.tb_invitations.create({
      data: {
        id_project: Number(id_project),
        id_inviter: inviterId,
        id_invitee: invitee.id_user,
        type: type,
      }
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as any).id);
    const body = await request.json();
    const { id_invitation, action } = body; // action: "accept" or "reject"

    const invitation = await prisma.tb_invitations.findUnique({
      where: { id_invitation: Number(id_invitation) }
    });

    if (!invitation || invitation.id_invitee !== userId || invitation.status !== "pending") {
      return NextResponse.json({ error: "Invalid invitation" }, { status: 400 });
    }

    if (action === "accept") {
      // Update invitation status
      await prisma.tb_invitations.update({
        where: { id_invitation: Number(id_invitation) },
        data: { status: "accepted" }
      });

      if (invitation.type === "role_change") {
        // Upgrade invitee to admin
        await prisma.tb_project_members.update({
          where: {
            id_project_id_user: { id_project: invitation.id_project, id_user: userId }
          },
          data: { role: "admin" }
        });

        // Downgrade inviter to member
        await prisma.tb_project_members.update({
          where: {
            id_project_id_user: { id_project: invitation.id_project, id_user: invitation.id_inviter }
          },
          data: { role: "member" }
        });
      } else {
        // Add user to project members
        await prisma.tb_project_members.create({
          data: {
            id_project: invitation.id_project,
            id_user: userId,
            role: "member"
          }
        });
      }
      return NextResponse.json({ message: "Invitation accepted" });
    } else if (action === "reject") {
      await prisma.tb_invitations.update({
        where: { id_invitation: Number(id_invitation) },
        data: { status: "rejected" }
      });
      return NextResponse.json({ message: "Invitation rejected" });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error handling invitation:", error);
    return NextResponse.json({ error: "Failed to handle invitation" }, { status: 500 });
  }
}
