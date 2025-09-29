import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { projects, clients, users, reviews, elements, comments, approvals, settings } from '@/db/schema'
import { eq, and, or, like, desc, asc, count } from 'drizzle-orm';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { status } = await req.json();

    if (!status || !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid status. Must be PENDING, APPROVED, or REJECTED",
        },
        { status: 400 }
      );
    }

    // Update review status
    const [review] = await db
      .update(reviews)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, id))
      .returning();

    // Emit socket event for real-time updates
    try {
      const { getSocketServer } = await import('@/lib/socket-server');
      const io = getSocketServer();
      
      if (io) {
        // Get the request headers to determine who is making the request
        const userAgent = req.headers.get('user-agent') || '';
        const isFromAdmin = userAgent.includes('admin') || req.url.includes('/admin/');
        
        // Create status update message
        const statusMessage = `📊 Review status updated to: ${status}`;
        
        io.to(`project-${review.projectId}`).emit('reviewStatusUpdated', {
          reviewId: review.id,
          projectId: review.projectId,
          status: status,
          updatedAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          message: statusMessage,
          isFromAdmin: isFromAdmin
        });
        
        // Send dummy success message to opposite user type
        if (isFromAdmin) {
          // Admin updated status, send success message to client
          io.to(`project-${review.projectId}`).emit('dummySuccessMessage', {
            type: 'status_updated',
            message: `✅ Review status updated to ${status} by Admin`,
            from: 'Admin',
            to: 'Client',
            timestamp: new Date().toISOString()
          });
        } else {
          // Client updated status, send success message to admin
          io.to(`project-${review.projectId}`).emit('dummySuccessMessage', {
            type: 'status_updated',
            message: `✅ Client updated review status to ${status}`,
            from: 'Client',
            to: 'Admin',
            timestamp: new Date().toISOString()
          });
        }
        
        console.log(`📡 Emitted reviewStatusUpdated for review ${review.id} in project ${review.projectId}`);
      } else {
        console.log("⚠️ Socket server not available for review status update");
      }
    } catch (error) {
      console.log("Socket emission error:", error);
    }

    return NextResponse.json({
      status: "success",
      message: "Review status updated successfully",
      data: review,
    });
  } catch (error) {
    console.error("Review status update error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to update review status",
      },
      { status: 500 }
    );
  }
}
